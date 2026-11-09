#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${LIBRECHAT_HOME:-$HOME/.local/share/ubuntu-ai/librechat}"
test -d "$ROOT/.git" || { echo "Install LibreChat first"; exit 1; }
cd "$ROOT"
git status --porcelain
if [ -n "$(git status --porcelain)" ]; then echo "Local changes detected. Resolve before updating."; exit 1; fi
git pull --ff-only
echo "Updated source. Review upstream migrations and release notes before restarting."
