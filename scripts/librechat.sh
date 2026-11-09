#!/usr/bin/env bash
set -Eeuo pipefail
# LibreChat launcher for Ubuntu AI System. No credentials are stored in Git.
ROOT="${LIBRECHAT_HOME:-$HOME/.local/share/ubuntu-ai/librechat}"
REPO="https://github.com/danny-avila/LibreChat.git"
usage(){ printf 'LibreChat Ubuntu AI\nUsage: %s {install|start|stop|restart|status|logs|configure|update}\n' "$0"; }
need(){ command -v "$1" >/dev/null || { echo "Missing dependency: $1" >&2; exit 1; }; }
compose(){ (cd "$ROOT" && docker compose "$@"); }
installed(){ test -f "$ROOT/docker-compose.yml" || test -f "$ROOT/compose.yaml"; }
case "${1:-}" in
 install)
   need git; need docker
   docker compose version >/dev/null
   if [ ! -d "$ROOT/.git" ]; then
     mkdir -p "$(dirname "$ROOT")"
     git clone "$REPO" "$ROOT"
   fi
   if [ ! -f "$ROOT/.env" ]; then
     cp "$ROOT/.env.example" "$ROOT/.env"
     chmod 600 "$ROOT/.env"
     echo "Review configuration at $ROOT/.env before starting."
   fi
   echo "Installed source in $ROOT; run '$0 configure', then '$0 start'."
   ;;
 configure)
   installed || { echo "Run install first"; exit 1; }
   ${EDITOR:-nano} "$ROOT/.env"
   ;;
 start)
   installed || { echo "Run install first"; exit 1; }
   compose up -d
   echo "LibreChat normally listens at http://localhost:3080 (check published ports)."
   ;;
 stop) installed || exit 1; compose down ;;
 restart) installed || exit 1; compose up -d --force-recreate ;;
 status) installed || exit 1; compose ps ;;
 logs) installed || exit 1; compose logs --tail=100 -f ;;
 update)
   installed || exit 1
   (cd "$ROOT" && git pull --ff-only)
   echo "Review upstream release notes and configuration changes before restarting."
   ;;
 *) usage; exit 2 ;;
esac
