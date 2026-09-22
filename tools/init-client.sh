#!/usr/bin/env bash
set -euo pipefail

# Scaffolds a per-client brand pack under brand/clients/<slug>/ so the content
# engine (/graphic-post, /carousel-post, /graphic-machine) can run for any
# client, not just the built-in one.
#
# Usage: init-client.sh <slug> ["Full Client Name"]
#   <slug>  lowercase id, [a-z0-9-]; the folder name and --client value
#
# Creates:
#   brand/clients/<slug>/graphic.brand.json   colors + asset paths (edit to brand)
#   brand/clients/<slug>/client.json          GHL location + scheduling config
#   brand/clients/<slug>/assets/fonts/        drop Inter woff2 here (400..900)
#   brand/clients/<slug>/assets/logo.b64      the light logo as a data: URI
#   brand/clients/<slug>/brand.md             voice / caption notes

SLUG="${1:?Usage: init-client.sh <slug> [\"Full Client Name\"]}"
NAME="${2:-$SLUG}"

if ! echo "$SLUG" | grep -qE '^[a-z0-9][a-z0-9-]*$'; then
  echo "Error: slug must be lowercase letters, digits and hyphens (got '$SLUG')" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
DIR="${REPO_ROOT}/brand/clients/${SLUG}"

if [ -d "$DIR" ]; then
  echo "Client '${SLUG}' already exists at ${DIR}" >&2
  exit 1
fi

mkdir -p "${DIR}/assets/fonts"
mkdir -p "${DIR}/media/headshots" "${DIR}/media/photos" "${DIR}/media/backgrounds" "${DIR}/media/logos"

cat > "${DIR}/media/README.txt" << 'TXT'
Client media for use in posts. Drop files here, then reference them in a spec via
"photo": "media/<folder>/<file>" (relative to this client pack).

  headshots/    people — for cover slides / announcement bands
  photos/       real photos (office, work, product)
  backgrounds/  full-bleed background images / textures
  logos/        partner / certification logos

Use high-res (>=1500px) JPG/PNG; keep faces clear of the caption band.
TXT

# Curated background library (licensed only) — see tools/bg-lib.mjs / bg-add.mjs
cat > "${DIR}/media/backgrounds/backgrounds.json" << 'JSON'
{
  "_comment": "Curated, LICENSED background library. NOT a dumping folder: every entry needs a license + source. Add with tools/bg-add.mjs; the selector is tools/bg-lib.mjs; /graphic-machine pulls from it when an item sets \"background\":\"auto\". Images here are gitignored (stay local).",
  "_schema": { "file": "media/backgrounds/<name>", "mood": "tech|local|abstract|human|texture", "pillars": ["optional pillar names; [] = any"], "orientation": "portrait|square|any", "scrim": "light|medium|strong", "focus": "optional 'x% y%'", "license": "REQUIRED", "source": "REQUIRED url/where", "credit": "optional" },
  "backgrounds": []
}
JSON

# Token env var name, e.g. GHL_TOKEN_ACME_CO
TOKEN_ENV="GHL_TOKEN_$(echo "$SLUG" | tr '[:lower:]-' '[:upper:]_')"

cat > "${DIR}/graphic.brand.json" << JSON
{
  "_comment": "Brand tokens for ${NAME}. Edit colors + drop assets, then generate. Local/gitignored.",
  "name": "${NAME}",
  "colors": {
    "bg":      "#0a172e",
    "bg2":     "#070f1d",
    "accent":  "#14c3eb",
    "accent2": "#1ad5ff",
    "text":    "#f8fafc",
    "muted":   "#c9d7e8",
    "dim":     "#9fb3cc",
    "warn":    "#f4b73f",
    "warnInk": "#1a1204"
  },
  "fontsDir": "assets/fonts",
  "logoB64":  "assets/logo.b64",
  "footer":   "${NAME}"
}
JSON

cat > "${DIR}/client.json" << JSON
{
  "name": "${NAME}",
  "slug": "${SLUG}",
  "brand": "graphic.brand.json",
  "ghl": {
    "locationId": "",
    "tokenEnv": "${TOKEN_ENV}"
  },
  "timezone": "America/Los_Angeles",
  "platformTimes": { "linkedin": "08:30", "linkedin_personal": "09:00", "facebook": "10:00", "instagram": "11:30", "gbp": "12:30" },
  "defaultLink": "",
  "platforms": ["instagram", "facebook", "linkedin", "gbp"],
  "notebookLM": ""
}
JSON

cat > "${DIR}/topics.seed.json" << JSON
{
  "_comment": "Content pillars + keywords for ${NAME}. /topic-queue expands these into a ranked topic backlog. Edit to the client's focus.",
  "pillars": ["Pillar one", "Pillar two", "Pillar three"],
  "audience": "who this client sells to",
  "keywords": ["keyword one", "keyword two"],
  "tone": "authoritative but plain-spoken",
  "link": ""
}
JSON

cat > "${DIR}/brand.md" << 'MD'
# Brand voice & caption notes

Fill this in so captions stay on-brand for this client.

- **Voice:** (e.g. authoritative, friendly, technical, playful)
- **Do:** phrases, themes, CTAs this client likes
- **Avoid:** words, claims, tones to steer clear of
- **Links:** primary site, booking link, blog
- **Per-channel notes:** LinkedIn vs Instagram vs Facebook vs GBP differences
MD

cat > "${DIR}/assets/fonts/README.txt" << 'TXT'
Drop the brand's self-hosted web fonts here as woff2, one per weight the
graphic templates use: inter-400.woff2, inter-600.woff2, inter-700.woff2,
inter-800.woff2, inter-900.woff2 (or the client's own family, matching the
weights referenced in the templates). If this folder is empty the generator
falls back to a system sans-serif.
TXT

echo "Created client pack: ${DIR}"
echo
echo "Next steps:"
echo "  1. Edit brand/clients/${SLUG}/graphic.brand.json — set the brand colors."
echo "  2. Add fonts to brand/clients/${SLUG}/assets/fonts/ and the logo as"
echo "     brand/clients/${SLUG}/assets/logo.b64 (a data:image/...;base64,... URI)."
echo "  3. Set the GHL location in brand/clients/${SLUG}/client.json (locationId),"
echo "     and put the Private Integration Token in .env as ${TOKEN_ENV}=..."
echo "  4. Fill in brand/clients/${SLUG}/brand.md (voice), topics.seed.json (pillars),"
echo "     and client.json defaultLink/platforms."
echo "  5. Build a topic backlog:  /topic-queue --client ${SLUG}"
echo "  6. Produce a batch from it:  /graphic-machine --client ${SLUG} --from-queue 5"
echo "     (or pass topics directly: /graphic-machine --client ${SLUG} topic one, topic two)"
