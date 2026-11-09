#!/usr/bin/env bash
set -Eeuo pipefail
# Local Ubuntu AI launcher for LibreChat. Uses real Docker state; no fake status.
ROOT="${LIBRECHAT_HOME:-$HOME/.local/share/ubuntu-ai/librechat}"
CMD="${1:-status}"
if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  echo "Docker with Compose is required" >&2; exit 1
fi
if [ ! -f "$ROOT/docker-compose.yml" ] && [ ! -f "$ROOT/compose.yaml" ]; then
  echo "LibreChat is not installed. Run bash scripts/install-librechat-once.sh" >&2; exit 1
fi
cd "$ROOT"
case "$CMD" in
 start)
   [ -f .env ] || { echo "Missing .env configuration" >&2; exit 1; }
   docker compose up -d
   echo "Check Docker published ports; LibreChat usually uses port 3080."
   ;;
 stop) docker compose stop ;;
 restart) docker compose restart ;;
 status) docker compose ps ;;
 logs) docker compose logs --tail=100 -f ;;
 configure) "${EDITOR:-nano}" .env ;;
 open)
   if command -v xdg-open >/dev/null 2>&1; then xdg-open "http://localhost:3080"
   else echo "Open http://localhost:3080 (or the forwarded port in Codespaces)"; fi
   ;;
 *) echo "Usage: $0 {start|stop|restart|status|logs|configure|open}" >&2; exit 2 ;;
esac
