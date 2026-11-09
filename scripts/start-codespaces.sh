#!/usr/bin/env bash
# Start the BastillaOS web application in Codespaces; no unattended VM provisioning.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
LOG="${BASTILLA_CODESPACES_LOG:-/tmp/bastilla-codespaces.log}"
if ! command -v npm >/dev/null 2>&1; then
  echo "npm is missing; cannot start BastillaOS." >&2
  exit 1
fi
if [[ ! -x node_modules/.bin/tsx ]]; then
  npm ci
fi
# keep-alive.sh uses flock to avoid duplicate servers after Codespaces restarts.
nohup bash scripts/keep-alive.sh >>"$LOG" 2>&1 </dev/null &
echo "BastillaOS startup requested. Waiting for HTTP readiness on port 3000..."
ready=0
for attempt in {1..30}; do
  if curl -fsS --max-time 2 http://127.0.0.1:3000/api/system/metrics >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
if (( ready == 0 )); then
  echo "ERROR: BastillaOS did not become HTTP-ready. Recent application log:" >&2
  if [[ -f /tmp/svl.log ]]; then
    tail -n 40 /tmp/svl.log >&2
  else
    echo "No /tmp/svl.log found; inspect $LOG" >&2
  fi
  exit 1
fi
echo "BastillaOS HTTP endpoint is responding. Run diagnostics to verify JSON content."
echo "To provision Debian 13 explicitly: bash scripts/auto-start-vm.sh"
echo "Run full readiness checks with: bash scripts/check-codespaces.sh"
