# Runbook: Footage → Scheduled Post

A step-by-step operator's guide for producing one video end to end. Every command here has
been run against a real edit. Where the older `SOP-video-content-pipeline.md` describes the
`/edit-video` and `/content-machine` commands at a high level, this is the manual path —
what to run, what to check, and what will bite you.

Read `docs/editing-method.md` first. It explains *why* the pause-detection and verification
steps below are shaped the way they are.

---

## 0. One-time setup

```sh
brew install ffmpeg
npm i -g hyperframes
./scripts/install-hooks.sh          # secret guard — do this before your first commit
cp .env.example .env                # then fill in real values
```

Pre-cache the whisper model; the CLI's own download times out at 30s:

```sh
mkdir -p ~/.cache/hyperframes/whisper/models
curl -L -o ~/.cache/hyperframes/whisper/models/ggml-small.en.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.en.bin
```

Replace the example brand. `brand/style_guide.md` ships as the neutral "Acme Video Co"
placeholder — see `docs/customization-guide.md`. Keep your real brand pack **out of this
repo** if it is public; `output/` and `brand/logos/*` are gitignored for that reason.

---

## 1. Workspace

```sh
W=output/<slug>-working
mkdir -p $W/{source,overlays,renders,assets,broll,captions,qc}
cp ~/Downloads/<footage>.MP4 $W/source/raw.mp4
cp -r <a previous video>/assets/. $W/assets/       # fonts + logo.b64
```

## 2. Probe before you assume

```sh
ffprobe -v error -show_streams -of default=nw=1 $W/source/raw.mp4 | grep -E 'width|height|codec_name'
ffprobe -v error -select_streams v:0 -show_entries stream_side_data_list -of default=nw=1 $W/source/raw.mp4
```

**Check the rotation matrix.** Phone footage is often stored 1920x1080 with `rotation=-90`,
meaning it is already vertical. Cropping it "to 9:16" would destroy it.

## 3. Normalise

```sh
ffmpeg -y -i source/raw.mp4 \
  -vf "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:color=<brand-bg>,setsar=1,fps=30" \
  -c:v libx264 -preset medium -crf 17 -pix_fmt yuv420p \
  -c:a aac -b:a 192k -ar 48000 -ac 2 -movflags +faststart \
  source/base_1080x1920.mp4
```

## 4. Find the real pauses — by RMS, not `silencedetect`

`silencedetect` is peak-based and will report zero silence on a take that is full of it.
Profile 20ms RMS windows instead; speech sits at -15..-30dB and room tone at -43..-53dB.
Treat <-40dB for >=0.24s as a pause. See `docs/editing-method.md` for the code.

## 5. Cut the dead air — never speed up speech

Cut inside each pause with a **0.10s margin** on both sides and leave **0.18-0.26s** behind.
Then rebuild the audio for transcription:

```sh
ffmpeg -y -i source/base_1080x1920.mp4 -/filter_complex filter_tight.txt \
  -map "[vo]" -map "[ao]" -c:v libx264 -crf 17 -pix_fmt yuv420p -r 30 \
  -c:a aac -b:a 192k -movflags +faststart source/base_tight.mp4
```

Note: this build of ffmpeg uses `-/filter_complex <file>`, not `-filter_complex_script`.

## 6. Transcribe the TIGHTENED audio

```sh
ffmpeg -y -i source/base_tight.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le source/tight16k.wav
hyperframes transcribe source/tight16k.wav --json
```

Order matters: whisper drifts across long pauses and will place words *inside* a silence.
Cutting first removes what it drifts into. `transcribe` writes `transcript.json` **next to
the input file** and will overwrite an existing one — rename it immediately.

## 7. Build overlays against those timings

`build-edit.mjs` (captions) and `build-graphics.mjs` (cards) emit Hyperframes compositions.

```sh
node build-edit.mjs && node build-graphics.mjs
hyperframes render overlays/graphics --format mov --output renders/graphics.mov &
hyperframes render overlays/captions --format mov --output renders/captions.mov &
wait
```

- Always `--format mov` — WebM VP9 alpha does not composite in ffmpeg.
- Root div needs `data-duration` or the render fails with "zero duration".
- Every timed animation needs `forwards`, or the element reverts to `opacity:0` mid-hold.
- A gradient on `.stage` renders transparent. Put it on a child `<div>` with `inset:0`.
- Keep card content clear of the caption band (y≈1380-1660) or they overlap.
- `logo.b64` already contains its own `data:image/...;base64,` prefix. Reference it as
  `src="${LOGO}"`; adding another prefix breaks the image silently.
- ~2-4 min per render. Run captions and graphics in parallel.

## 8. Composite — one pass

Base + graphics + captions + ducked music, voice normalised, master to -14 LUFS / -1 dBTP.
Apply any remaining time manipulation **once**, to the finished composite, so nothing drifts.

## 9. Verify — the gate

```sh
ffmpeg -y -i renders/<final>.mp4 -vn -ac 1 -ar 16000 -c:a pcm_s16le qc/out16k.wav
hyperframes transcribe qc/out16k.wav --json
```

Diff word-for-word against the source transcript. **Normalise first** — numerals
(`nine`/`9`), merged tokens (`chat GPT`/`ChatGPT`), ASR spelling variants, unstressed
articles (`the`/`a`). A substitution at the same index is an ASR artifact. A **deletion is a
clipped word** and must block the render.

Also confirm: duration, 1080x1920, faststart, no black frames, and caption cues aligned to
the output audio.

---

## 10. Publish

Read the corrected API notes in `.claude/agents/social-publisher.md` before hand-rolling
calls. The traps that cost real time:

| Trap | Correct behaviour |
|---|---|
| YouTube Shorts posted as landscape | `type: "reel"`, not `"post"` |
| `type` won't change on update | It is immutable — DELETE and recreate |
| 422 "property should not exist" | `youtubePostDetails` / `tiktokPostDetails` — exact casing |
| YouTube title ignored | No `title` param; line 1 of `summary` + `youtubePostDetails.title` |
| Create "failed" but posted | 201 nests the post at `results.post` |
| `platform: "google"` on every post | Cosmetic default; delivery follows `accountIds` |
| 422 on posts/list | `limit`/`skip` must be **strings** |
| 401 on `/locations/{id}` | Not a posting failure; posting needs only `social-media-posting` + `medias` |

Verify scopes with `GET /social-media-posting/{locationId}/accounts` — never assume from a
401 elsewhere. Post `status: "scheduled"` so it sits in the queue, editable until it fires.

**Always get human approval before anything goes out.**

---

## Where things live

| Path | Tracked? | What |
|---|---|---|
| `templates/`, `docs/`, `tools/`, `.claude/` | yes | the engine |
| `brand/style_guide.md` | yes | neutral example brand |
| `brand/logos/*`, your brand pack | **no** | replace per organisation |
| `output/` | **no** | per-video client work |
| `.env`, `.githooks/private-patterns.txt` | **no** | secrets and the blocklist |

If this repo is public, keep it that way. Git history is permanent: content pushed and later
deleted still lives in history and in every fork.
