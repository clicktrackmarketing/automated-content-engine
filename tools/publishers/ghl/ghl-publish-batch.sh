#!/usr/bin/env bash
set -uo pipefail

# Reads a rendered batch manifest and schedules every item to its platforms
# via the existing GHL sub-scripts (ghl-post.sh / ghl-carousel-post.sh /
# ghl-upload-image.sh), resolving accounts from live ghl-accounts.sh output.
#
# Usage:
#   ghl-publish-batch.sh <batchdir> [--user-id <id>] [--status scheduled|in_review] [--dry-run] [--force]
#     <batchdir> contains batch.manifest.json and review.md
#
# Env (the CALLER sources .env; this script does not):
#   GHL_API_KEY       Private Integration Token
#   GHL_LOCATION_ID   sub-account location id
#
# Notes:
#   - set -uo pipefail (NOT -e): per-post failures are handled inline and never
#     abort the whole batch.
#   - Approval gate: unless --force, refuses to publish while any unchecked
#     "- [ ]" box remains in <batchdir>/review.md.

: "${GHL_API_KEY:?Set GHL_API_KEY environment variable (Private Integration Token)}"
: "${GHL_LOCATION_ID:?Set GHL_LOCATION_ID environment variable}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UPLOAD_SH="${SCRIPT_DIR}/ghl-upload-image.sh"
POST_SH="${SCRIPT_DIR}/ghl-post.sh"
CAROUSEL_SH="${SCRIPT_DIR}/ghl-carousel-post.sh"
ACCOUNTS_SH="${SCRIPT_DIR}/ghl-accounts.sh"

# ---- Parse arguments --------------------------------------------------------
BATCH_DIR=""
USER_ID=""
STATUS="in_review"
DRY_RUN=0
FORCE=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --user-id) USER_ID="$2"; shift 2 ;;
    --status)  STATUS="$2"; shift 2 ;;
    --dry-run) DRY_RUN=1; shift ;;
    --force)   FORCE=1; shift ;;
    -h|--help)
      grep '^#' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
    -*)        echo "Unknown flag: $1" >&2; exit 1 ;;
    *)
      if [[ -z "$BATCH_DIR" ]]; then BATCH_DIR="$1"; shift
      else echo "Unexpected argument: $1" >&2; exit 1; fi ;;
  esac
done

: "${BATCH_DIR:?Usage: ghl-publish-batch.sh <batchdir> [--user-id <id>] [--status scheduled|in_review] [--dry-run] [--force]}"

case "$STATUS" in
  scheduled|in_review) ;;
  *) echo "Error: --status must be 'scheduled' or 'in_review' (got '$STATUS')" >&2; exit 1 ;;
esac

BATCH_DIR="${BATCH_DIR%/}"
MANIFEST="${BATCH_DIR}/batch.manifest.json"
REVIEW="${BATCH_DIR}/review.md"
LOG="${BATCH_DIR}/publish-log.md"

[[ -d "$BATCH_DIR" ]] || { echo "Error: batch directory not found: ${BATCH_DIR}" >&2; exit 1; }
[[ -f "$MANIFEST" ]] || { echo "Error: manifest not found: ${MANIFEST}" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "Error: python3 is required" >&2; exit 1; }

# GHL QUIRK guard: a multi-image carousel created directly as status=scheduled
# loses every slide but the first. If the batch contains any carousel post,
# require in_review (approve in GHL afterwards, which preserves all slides).
if [[ "$STATUS" == "scheduled" ]]; then
  HAS_CAROUSEL="$(python3 -c '
import json,sys
d=json.load(open(sys.argv[1]))
print("yes" if any(p.get("kind")=="carousel" for it in (d.get("items") or []) for p in (it.get("posts") or [])) else "no")
' "$MANIFEST" 2>/dev/null || echo no)"
  if [[ "$HAS_CAROUSEL" == "yes" ]]; then
    echo "Error: this batch contains carousels, and GHL collapses a carousel to one image when" >&2
    echo "       created with status=scheduled. Run with --status in_review, then approve the posts" >&2
    echo "       in GHL's Social Planner (its approve action keeps all slides)." >&2
    exit 1
  fi
fi

# ---- Approval gate ----------------------------------------------------------
if [[ $FORCE -eq 0 ]]; then
  if [[ ! -f "$REVIEW" ]]; then
    echo "Error: approval file not found: ${REVIEW}" >&2
    echo "       Add a review.md with all boxes checked, or pass --force to override." >&2
    exit 1
  fi
  # Count unchecked checkboxes: "- [ ]" (any indentation).
  UNCHECKED=$(grep -cE '^[[:space:]]*-[[:space:]]\[[[:space:]]\]' "$REVIEW" 2>/dev/null || true)
  UNCHECKED="${UNCHECKED:-0}"
  if [[ "$UNCHECKED" -gt 0 ]]; then
    echo "Error: approval incomplete — ${UNCHECKED} unchecked box(es) remain in ${REVIEW}." >&2
    echo "       Unchecked items:" >&2
    grep -nE '^[[:space:]]*-[[:space:]]\[[[:space:]]\]' "$REVIEW" | sed 's/^/         /' >&2
    echo "       Check every box (or pass --force) before publishing." >&2
    exit 1
  fi
  echo "Approval gate: OK (no unchecked boxes in review.md)."
else
  echo "Approval gate: SKIPPED (--force)."
fi

# ---- Scratch workdir --------------------------------------------------------
WORK="$(mktemp -d "${TMPDIR:-/tmp}/ghl-batch.XXXXXX")"
cleanup() { rm -rf "$WORK"; }
trap cleanup EXIT

# ---- Build target -> accountId map (ONCE) -----------------------------------
# NOTE: this host only ships bash 3.2 (like the sibling scripts), which has no
# associative arrays. The target->accountId map and the upload-dedup cache are
# therefore kept in parallel indexed arrays with linear-scan lookups — same
# behavior (built once, first match wins, upload each path at most once).
TGT_KEYS=()   # e.g. instagram, facebook, gbp, linkedin:page, linkedin:personal
TGT_VALS=()   # matching accountId
acct_for() {  # $1=target -> echoes accountId (empty if none)
  local want="$1" i n=${#TGT_KEYS[@]}
  for ((i=0; i<n; i++)); do
    if [[ "${TGT_KEYS[$i]}" == "$want" ]]; then printf '%s' "${TGT_VALS[$i]}"; return 0; fi
  done
  return 0
}
echo "Resolving connected accounts via ghl-accounts.sh ..."
ACCT_JSON="$("$ACCOUNTS_SH" 2>/dev/null || true)"
if [[ -n "$ACCT_JSON" ]]; then
  # python emits: "<target>\t<accountId>" lines for each matched account.
  while IFS=$'\t' read -r _tgt _aid; do
    [[ -n "$_tgt" && -n "$_aid" ]] || continue
    # First match wins per target (stable).
    if [[ -z "$(acct_for "$_tgt")" ]]; then TGT_KEYS+=("$_tgt"); TGT_VALS+=("$_aid"); fi
  done < <(printf '%s' "$ACCT_JSON" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(0)
accts = ((d.get("results") or {}).get("accounts")) if isinstance(d.get("results"), dict) else d.get("accounts")
if not isinstance(accts, list):
    accts = []
for a in accts:
    if not isinstance(a, dict):
        continue
    plat = (a.get("platform") or "").lower()
    typ  = (a.get("type") or "").lower()
    aid  = a.get("id") or a.get("_id") or ""
    if not aid:
        continue
    tgt = None
    if plat == "facebook" and typ == "page":   tgt = "facebook"
    elif plat == "instagram":                  tgt = "instagram"
    elif plat == "linkedin" and typ == "page": tgt = "linkedin:page"
    elif plat == "linkedin" and typ == "profile": tgt = "linkedin:personal"
    elif plat == "google":                     tgt = "gbp"
    if tgt:
        print(f"{tgt}\t{aid}")
')
fi

if [[ ${#TGT_KEYS[@]} -eq 0 ]]; then
  echo "Warning: no connected accounts resolved (ghl-accounts.sh returned nothing usable)." >&2
  echo "         Posts whose target has no account will be skipped with a warning." >&2
else
  echo "Resolved ${#TGT_KEYS[@]} target(s): ${TGT_KEYS[*]}"
fi

# ---- Determine posting user id ----------------------------------------------
detect_user_id() {
  local resp code body
  resp="$(curl -s -w $'\n%{http_code}' \
    -X POST "https://services.leadconnectorhq.com/social-media-posting/${GHL_LOCATION_ID}/posts/list" \
    -H "Authorization: Bearer ${GHL_API_KEY}" \
    -H "Version: 2021-07-28" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -d '{"limit":"1","skip":"0"}' 2>/dev/null)"
  code="$(printf '%s' "$resp" | tail -n1)"
  body="$(printf '%s' "$resp" | sed '$d')"
  [[ "$code" =~ ^2 ]] || return 1
  printf '%s' "$body" | python3 -c '
import sys, json
try:
    d = json.load(sys.stdin)
except Exception:
    sys.exit(1)
posts = (d.get("results") or {}).get("posts") if isinstance(d.get("results"), dict) else d.get("posts")
if isinstance(posts, list) and posts and isinstance(posts[0], dict):
    cb = posts[0].get("createdBy") or ""
    if cb:
        print(cb); sys.exit(0)
sys.exit(1)
'
}

if [[ -z "$USER_ID" ]]; then
  echo "No --user-id given; auto-detecting via posts/list createdBy ..."
  USER_ID="$(detect_user_id || true)"
  if [[ -z "$USER_ID" ]]; then
    if [[ $DRY_RUN -eq 1 ]]; then
      echo "Warning: could not auto-detect posting user id (offline/empty); dry-run continues." >&2
      USER_ID="<auto-detect-unavailable>"
    else
      echo "Error: could not determine posting user id. Pass --user-id <id> explicitly." >&2
      exit 1
    fi
  else
    echo "Detected posting user id: ${USER_ID}"
  fi
fi

# GHL requires an approver when submitting a post for review. Pass the posting
# user as the approver for in_review posts. (bash 3.2-safe empty-array guard.)
APPROVER_ARGS=()
if [[ "$STATUS" == "in_review" && "$USER_ID" != "<auto-detect-unavailable>" ]]; then
  APPROVER_ARGS=(--approver "$USER_ID")
fi

# ---- Flatten manifest into a control file + per-post caption/media files -----
# control.tsv columns: idx, item_id, kind, target, platform, scheduleUTC, cap_status, link, n_media
CTRL="${WORK}/control.tsv"
MANIFEST="$MANIFEST" WORK="$WORK" python3 -c '
import sys, json, os
mf = os.environ["MANIFEST"]; work = os.environ["WORK"]
with open(mf, encoding="utf-8") as f:
    data = json.load(f)

def pick_caption(caps, target, platform):
    caps = caps or {}
    if target == "linkedin:page":       c = caps.get("linkedin", "")
    elif target == "linkedin:personal": c = caps.get("linkedin_personal", "")
    elif target == "gbp":               c = caps.get("gbp", "")
    else:                               c = caps.get(platform, "")
    c = c or ""
    if c.strip():
        return c, "ok"
    fb = caps.get("instagram", "") or ""
    if fb.strip():
        return fb, "fallback"
    return "", "empty"

items = data.get("items") or []
ctrl = open(os.path.join(work, "control.tsv"), "w", encoding="utf-8")
idx = 0
for item in items:
    if not isinstance(item, dict):
        continue
    media_all = [m for m in (item.get("media") or []) if m]
    caps = item.get("captions") or {}
    link = item.get("link") or ""
    item_id = item.get("id") or ""
    for post in (item.get("posts") or []):
        if not isinstance(post, dict):
            continue
        kind = post.get("kind") or ""
        target = post.get("target") or ""
        platform = post.get("platform") or ""
        sched = post.get("scheduleUTC") or ""
        cap, status = pick_caption(caps, target, platform)
        # media relevant to THIS post: carousel -> all; else cover (media[0]).
        if kind == "carousel":
            media = media_all
        else:
            media = media_all[:1]
        with open(os.path.join(work, f"cap.{idx}.txt"), "w", encoding="utf-8") as cf:
            cf.write(cap)
        with open(os.path.join(work, f"media.{idx}.txt"), "w", encoding="utf-8") as mf2:
            for m in media:
                mf2.write(m + "\n")
        row = [str(idx), item_id, kind, target, platform, sched, status, link, str(len(media))]
        # Join with US (\x1f), a non-whitespace separator, so EMPTY fields
        # (e.g. an empty link) survive `read` without column-shift. Tabs would
        # collapse (whitespace IFS), misaligning later columns.
        clean = [x.replace("\x1f", " ").replace("\n", " ") for x in row]
        ctrl.write("\x1f".join(clean) + "\n")
        idx += 1
ctrl.close()
' || { echo "Error: failed to parse manifest ${MANIFEST}" >&2; exit 1; }

# ---- Upload cache (dedup) ---------------------------------------------------
# FILE-BACKED cache: upload_once is always called inside $( … ), which runs in a
# subshell, so an in-memory array would not survive back to the parent. A file
# in the work dir does. Each distinct local path is uploaded at most once;
# later requests return the cached hosted URL. Records are "path<US>url".
CACHE_FILE="${WORK}/upload-cache.tsv"
: > "$CACHE_FILE"

upload_once() {
  # $1 = local path; echoes hosted URL on success, returns non-zero on failure.
  local path="$1" url hit
  hit="$(awk -F$'\x1f' -v p="$path" '$1==p{print $2; exit}' "$CACHE_FILE" 2>/dev/null)"
  if [[ -n "$hit" ]]; then printf '%s' "$hit"; return 0; fi
  url="$("$UPLOAD_SH" "$path" 2>/dev/null | tail -n1)"
  if [[ -z "$url" || "$url" == Error:* ]]; then
    return 1
  fi
  printf '%s\x1f%s\n' "$path" "$url" >> "$CACHE_FILE"
  printf '%s' "$url"
}

extract_post_id() {
  # Reads sub-script stdout on stdin; prints a created post id if found.
  python3 -c '
import sys, re, json
txt = sys.stdin.read()
# Try the carousel one-liner first: "_id: <id>"
m = re.search(r"_id:\s*([A-Za-z0-9_-]+)", txt)
if m:
    print(m.group(1)); sys.exit(0)
# Try JSON blobs in the output.
for m in re.finditer(r"\{.*\}", txt, re.S):
    try:
        d = json.loads(m.group(0))
    except Exception:
        continue
    post = (d.get("results") or {}).get("post") if isinstance(d.get("results"), dict) else None
    if not isinstance(post, dict):
        post = d.get("post") if isinstance(d.get("post"), dict) else d
    pid = post.get("_id") or post.get("id")
    if pid:
        print(pid); sys.exit(0)
' 2>/dev/null || true
}

# ---- Log header -------------------------------------------------------------
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
BATCH_NAME="$(basename "$BATCH_DIR")"
{
  echo ""
  echo "## Publish run ${NOW_UTC} — batch \`${BATCH_NAME}\`"
  echo ""
  echo "- status: \`${STATUS}\`  |  user-id: \`${USER_ID}\`  |  dry-run: \`$([[ $DRY_RUN -eq 1 ]] && echo yes || echo no)\`  |  force: \`$([[ $FORCE -eq 1 ]] && echo yes || echo no)\`"
  echo ""
  echo "| item | platform | target | schedule (UTC) | result | detail |"
  echo "|---|---|---|---|---|---|"
} >> "$LOG"

N_SCHEDULED=0
N_SKIPPED=0
N_FAILED=0

log_row() { # item platform target sched result detail
  echo "| $1 | $2 | $3 | $4 | $5 | $6 |" >> "$LOG"
}

# ---- Main loop --------------------------------------------------------------
echo ""
echo "Processing batch \`${BATCH_NAME}\` ($([[ $DRY_RUN -eq 1 ]] && echo 'DRY RUN' || echo 'LIVE'))"
echo "--------------------------------------------------------------------"

while IFS=$'\x1f' read -r IDX ITEM_ID KIND TARGET PLATFORM SCHED CAP_STATUS LINK N_MEDIA; do
  [[ -n "${IDX:-}" ]] || continue
  CAP_FILE="${WORK}/cap.${IDX}.txt"
  MEDIA_FILE="${WORK}/media.${IDX}.txt"
  CAPTION="$(cat "$CAP_FILE" 2>/dev/null)"
  CAP_FIRST_LINE="$(printf '%s' "$CAPTION" | head -n1)"

  LABEL="${ITEM_ID} [${PLATFORM}/${TARGET}]"

  # Resolve account.
  ACCT="$(acct_for "$TARGET")"
  if [[ -z "$ACCT" ]]; then
    echo "SKIP  ${LABEL}: no connected account for target '${TARGET}'"
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "skipped" "no connected account for target"
    N_SKIPPED=$((N_SKIPPED+1))
    continue
  fi

  # Caption resolution status.
  if [[ "$CAP_STATUS" == "empty" ]]; then
    echo "SKIP  ${LABEL}: no caption available (and no instagram fallback)"
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "skipped" "empty caption, no fallback"
    N_SKIPPED=$((N_SKIPPED+1))
    continue
  elif [[ "$CAP_STATUS" == "fallback" ]]; then
    echo "WARN  ${LABEL}: caption empty for this channel; falling back to instagram caption"
  fi

  # Read media paths (order preserved).
  MEDIA_PATHS=()
  if [[ -f "$MEDIA_FILE" ]]; then
    while IFS= read -r _m; do [[ -n "$_m" ]] && MEDIA_PATHS+=("$_m"); done < "$MEDIA_FILE"
  fi
  if [[ ${#MEDIA_PATHS[@]} -eq 0 ]]; then
    echo "SKIP  ${LABEL}: no media in manifest for this post"
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "skipped" "no media"
    N_SKIPPED=$((N_SKIPPED+1))
    continue
  fi

  # ---- DRY RUN: print intent, no upload/post ----
  if [[ $DRY_RUN -eq 1 ]]; then
    echo "PLAN  ${LABEL}"
    echo "        kind:      ${KIND}"
    echo "        account:   ${ACCT}"
    echo "        caption:   ${CAP_FIRST_LINE}"
    echo "        media:     ${#MEDIA_PATHS[@]} file(s)  (first: $(basename "${MEDIA_PATHS[0]}"))"
    echo "        schedule:  ${SCHED}"
    if [[ "$KIND" == "graphic-cover" && -n "$LINK" ]]; then
      echo "        cta:       LEARN_MORE -> ${LINK}"
    fi
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "dry-run" "kind=${KIND}, acct=${ACCT}, media=${#MEDIA_PATHS[@]}"
    N_SCHEDULED=$((N_SCHEDULED+1))
    continue
  fi

  # ---- LIVE: upload media (dedup) ----
  UPLOADED_URLS=()
  UPLOAD_FAILED=0
  for _p in "${MEDIA_PATHS[@]}"; do
    _url="$(upload_once "$_p")"
    if [[ $? -ne 0 || -z "$_url" ]]; then
      echo "FAIL  ${LABEL}: upload failed for $(basename "$_p")"
      UPLOAD_FAILED=1
      break
    fi
    UPLOADED_URLS+=("$_url")
  done
  if [[ $UPLOAD_FAILED -eq 1 ]]; then
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "failed" "media upload failed"
    N_FAILED=$((N_FAILED+1))
    continue
  fi

  # ---- LIVE: post ----
  OUT=""
  RC=0
  case "$KIND" in
    carousel)
      CSV="$(IFS=,; echo "${UPLOADED_URLS[*]}")"
      OUT="$("$CAROUSEL_SH" \
        --account-id "$ACCT" --user-id "$USER_ID" \
        "${APPROVER_ARGS[@]+"${APPROVER_ARGS[@]}"}" \
        --summary "$CAPTION" \
        --media-urls "$CSV" --media-type image/png \
        --status "$STATUS" --schedule "$SCHED" 2>&1)"
      RC=$?
      ;;
    graphic)
      OUT="$("$POST_SH" \
        --account-id "$ACCT" --user-id "$USER_ID" \
        "${APPROVER_ARGS[@]+"${APPROVER_ARGS[@]}"}" \
        --summary "$CAPTION" \
        --media-url "${UPLOADED_URLS[0]}" --media-type image/png \
        --post-type post --status "$STATUS" --schedule "$SCHED" 2>&1)"
      RC=$?
      ;;
    graphic-cover)
      if [[ -n "$LINK" ]]; then
        OUT="$("$POST_SH" \
          --account-id "$ACCT" --user-id "$USER_ID" \
        "${APPROVER_ARGS[@]+"${APPROVER_ARGS[@]}"}" \
          --summary "$CAPTION" \
          --media-url "${UPLOADED_URLS[0]}" --media-type image/png \
          --post-type post --status "$STATUS" --schedule "$SCHED" \
          --cta-url "$LINK" --cta-type LEARN_MORE 2>&1)"
        RC=$?
      else
        OUT="$("$POST_SH" \
          --account-id "$ACCT" --user-id "$USER_ID" \
        "${APPROVER_ARGS[@]+"${APPROVER_ARGS[@]}"}" \
          --summary "$CAPTION" \
          --media-url "${UPLOADED_URLS[0]}" --media-type image/png \
          --post-type post --status "$STATUS" --schedule "$SCHED" 2>&1)"
        RC=$?
      fi
      ;;
    *)
      echo "SKIP  ${LABEL}: unknown post kind '${KIND}'"
      log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "skipped" "unknown kind '${KIND}'"
      N_SKIPPED=$((N_SKIPPED+1))
      continue
      ;;
  esac

  if [[ $RC -eq 0 ]]; then
    PID="$(printf '%s' "$OUT" | extract_post_id)"
    echo "OK    ${LABEL}: scheduled ${SCHED}${PID:+  (post ${PID})}"
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "scheduled" "post id: ${PID:-n/a}"
    N_SCHEDULED=$((N_SCHEDULED+1))
  else
    ERR_LINE="$(printf '%s' "$OUT" | grep -i -m1 -E 'error|http' || printf '%s' "$OUT" | tail -n1)"
    echo "FAIL  ${LABEL}: ${ERR_LINE}"
    log_row "$ITEM_ID" "$PLATFORM" "$TARGET" "$SCHED" "failed" "${ERR_LINE//|/ }"
    N_FAILED=$((N_FAILED+1))
  fi
done < "$CTRL"

# ---- Summary ----------------------------------------------------------------
{
  echo ""
  echo "**Summary:** scheduled ${N_SCHEDULED} · skipped ${N_SKIPPED} · failed ${N_FAILED}"
} >> "$LOG"

echo "--------------------------------------------------------------------"
echo ""
echo "Summary ($([[ $DRY_RUN -eq 1 ]] && echo 'dry-run' || echo 'live'))"
printf '  %-12s %s\n' "scheduled:" "$N_SCHEDULED"
printf '  %-12s %s\n' "skipped:"   "$N_SKIPPED"
printf '  %-12s %s\n' "failed:"    "$N_FAILED"
echo ""
echo "Log appended to: ${LOG}"

# Non-zero exit only if something outright failed (skips are not failures).
if [[ $N_FAILED -gt 0 ]]; then exit 1; fi
exit 0
