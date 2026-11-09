#!/usr/bin/env bash
# Start a private, loopback-only MCP bridge after BastillaOS web starts.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
mkdir -p .runtime
if ! curl -fsS --max-time 3 http://127.0.0.1:3000/api/ai/status >/dev/null; then
  echo "BastillaOS API unavailable; refusing to start MCP bridge" >&2
  exit 1
fi
if [[ ! -x .venv-mcp/bin/python ]]; then python3 -m venv .venv-mcp; fi
.venv-mcp/bin/python -m pip install -q -r integrations/mcp/requirements.txt
if .venv-mcp/bin/python integrations/mcp/healthcheck.py >.runtime/codespaces-mcp-check.log 2>&1; then
  echo "Existing MCP listener verified by handshake; port 8000 remains private."
  exit 0
fi
if (echo >/dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then
  echo "Port 8000 occupied by an unverified service; refusing to start a duplicate" >&2
  exit 1
fi
export BASTILLA_API_URL=http://127.0.0.1:3000
nohup .venv-mcp/bin/python integrations/mcp/server.py >.runtime/codespaces-mcp.log 2>&1 </dev/null &
for attempt in $(seq 1 30); do
  if .venv-mcp/bin/python integrations/mcp/healthcheck.py >.runtime/codespaces-mcp-check.log 2>&1; then
    echo "MCP local handshake OK. Port 8000 must remain private."
    exit 0
  fi
  sleep 2
done
echo "MCP did not pass local handshake; inspect .runtime/codespaces-mcp.log" >&2
exit 1
