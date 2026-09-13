#!/bin/sh
# Point git at the tracked hooks in .githooks/ so every clone shares them.
set -e
cd "$(dirname "$0")/.."
git config core.hooksPath .githooks
chmod +x .githooks/* 2>/dev/null || true
echo "✓ core.hooksPath = .githooks"
if [ ! -f .githooks/private-patterns.txt ]; then
  cp .githooks/private-patterns.txt.example .githooks/private-patterns.txt 2>/dev/null || true
  echo "✓ created .githooks/private-patterns.txt (git-ignored) — add your internal strings to it"
fi
echo "\u2713 pre-commit secret guard active \u2014 see SECURITY.md for what it blocks"
