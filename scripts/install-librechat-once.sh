#!/usr/bin/env bash
set -Eeuo pipefail
ROOT="${LIBRECHAT_HOME:-$HOME/.local/share/ubuntu-ai/librechat}"
MARKER="$ROOT/.ubuntu-ai-installed"
SELF="${BASH_SOURCE[0]}"
command -v git >/dev/null || { echo "Install git first"; exit 1; }
command -v docker >/dev/null || { echo "Install Docker first"; exit 1; }
docker compose version >/dev/null || { echo "Docker Compose plugin required"; exit 1; }
if [ ! -f "$MARKER" ]; then
  if [ ! -d "$ROOT/.git" ]; then
    mkdir -p "$(dirname "$ROOT")"
    git clone https://github.com/danny-avila/LibreChat.git "$ROOT"
  fi
  if [ ! -f "$ROOT/.env" ]; then
    cp "$ROOT/.env.example" "$ROOT/.env"
    chmod 600 "$ROOT/.env"
  fi
  touch "$MARKER"
  echo "LibreChat source and configuration prepared at $ROOT"
fi
echo "Configure credentials using scripts/librechat.sh configure, then start with scripts/librechat.sh start"
# Remove only this one-time installer from the local checkout after successful preparation.
# Do not remove the repository, service manager, .env, data, or other scripts.
if [ "${UBUNTU_AI_KEEP_INSTALLER:-0}" != "1" ] && [ -f "$SELF" ]; then
  rm -- "$SELF"
  echo "Removed one-time installer from this local working tree (GitHub copy remains)."
fi
