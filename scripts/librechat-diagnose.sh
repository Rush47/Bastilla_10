#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${LIBRECHAT_HOME:-$HOME/.local/share/ubuntu-ai/librechat}"
for bin in git docker; do command -v "$bin" >/dev/null && echo "$bin: OK" || echo "$bin: MISSING"; done
docker compose version || true
if [ -d "$ROOT" ]; then
 echo "LibreChat directory: $ROOT"
 (cd "$ROOT" && docker compose ps) || true
 (cd "$ROOT" && docker compose logs --tail=30) || true
else echo "LibreChat not installed"; fi
