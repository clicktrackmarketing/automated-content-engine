#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${1:?Usage: init-project.sh <project-name>}"

# Resolve repo root relative to this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
BASE_DIR="${REPO_ROOT}/projects/${PROJECT_NAME}"

if [ -d "$BASE_DIR" ]; then
  echo "Project '${PROJECT_NAME}' already exists at ${BASE_DIR}"
  exit 1
fi

mkdir -p "${BASE_DIR}"/{clips,images,overlays,audio,output,captions}

cat > "${BASE_DIR}/brief.md" << 'BRIEF'
# Project Brief

## Concept
<!-- Describe the video concept -->

## Platform & Format
- **Platform:** TikTok / YouTube / Instagram
- **Aspect Ratio:** 9:16 / 16:9 / 1:1
- **Duration:** 15s / 30s / 60s

## Shot List

| # | Duration | Description | Model | Notes |
|---|----------|-------------|-------|-------|
| 1 | 5s | | | |

## Narration Script
<!-- Write the voiceover script here -->

## Overlays
- [ ] Title card
- [ ] Lower thirds
- [ ] CTA end card
- [ ] Captions
BRIEF

echo "Created project: ${BASE_DIR}"
echo "  clips/     - raw AI video clips"
echo "  images/    - generated keyframe images"
echo "  overlays/  - rendered overlay videos"
echo "  audio/     - voiceover + transcripts"
echo "  captions/  - platform-specific captions"
echo "  output/    - final assembled videos"
echo "  brief.md   - creative brief template"
