#!/usr/bin/env bash
# Read-only Codespaces diagnostics; never expose private MCP ports.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
echo "BastillaOS Codespaces connectivity report"
echo "======================================"
if curl --fail --silent --show-error --max-time 5 http://127.0.0.1:3000/api/ai/status > /tmp/bastilla-api-status.json; then
  python3 -m json.tool /tmp/bastilla-api-status.json | head -n 35
  echo "BastillaOS API: PASS"
else
  echo "BastillaOS API: FAIL" >&2
  exit 1
fi
if [[ ! -x .venv-mcp/bin/python ]]; then
  echo "MCP Python environment: MISSING" >&2
  exit 1
fi
if .venv-mcp/bin/python integrations/mcp/healthcheck.py; then
  echo "MCP local handshake: PASS"
else
  echo "MCP local handshake: FAIL" >&2
  exit 1
fi
echo "External ChatGPT connection: NOT TESTED (Codespaces MCP port is private)"
echo "Google AI Studio synchronization: NOT TESTED"
