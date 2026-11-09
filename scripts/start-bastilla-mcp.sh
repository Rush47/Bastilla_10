#!/usr/bin/env bash
# Start BastillaOS and its local MCP bridge; verify real Ollama reachability.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-3000}"
export BASTILLA_API_URL="${BASTILLA_API_URL:-http://127.0.0.1:${PORT}}"
export OLLAMA_BASE_URL="${OLLAMA_BASE_URL:-http://127.0.0.1:11434}"
export LLM_PROVIDERS="${LLM_PROVIDERS:-ollama}"
VENV=".venv-mcp"
mkdir -p .runtime
pids=()
cleanup() {
  for pid in "${pids[@]}"; do kill "$pid" 2>/dev/null || true; done
}
trap cleanup EXIT INT TERM
report() { printf '[BASTILLA] %s\n' "$*"; }
wait_http() {
  local url="$1" attempts="${2:-30}"
  for ((i=0;i<attempts;i++)); do
    if curl -fsS --max-time 2 "$url" >/dev/null 2>&1; then return 0; fi
    sleep 1
  done
  return 1
}
if ! command -v curl >/dev/null 2>&1; then report "ERROR: curl missing"; exit 1; fi
if ! command -v node >/dev/null 2>&1; then report "ERROR: Node.js missing"; exit 1; fi
if ! command -v python3 >/dev/null 2>&1; then report "ERROR: Python 3 missing"; exit 1; fi
if ! command -v ollama >/dev/null 2>&1; then
  report "Ollama binary not found. Set up Ollama on this host first (npm run setup:ollama)."
elif curl -fsS --max-time 3 "${OLLAMA_BASE_URL%/}/api/tags" >/dev/null 2>&1; then
  report "Ollama reachable: ${OLLAMA_BASE_URL}"
else
  report "Ollama not responding. Attempting local ollama serve..."
  if [[ "$OLLAMA_BASE_URL" == "http://127.0.0.1:11434" ]]; then
    OLLAMA_HOST=127.0.0.1:11434 ollama serve >.runtime/ollama.log 2>&1 &
    pids+=("$!")
  fi
fi
if wait_http "${OLLAMA_BASE_URL%/}/api/tags" 15; then
  report "Ollama API ONLINE"
else
  report "WARNING: Ollama API OFFLINE; MCP diagnostics will show connected=false."
fi
if [[ ! -x node_modules/.bin/tsx ]]; then report "Installing npm dependencies..."; npm ci; fi
if curl -fsS --max-time 2 "${BASTILLA_API_URL%/}/api/ai/status" >/dev/null 2>&1; then
  report "BastillaOS API already online: ${BASTILLA_API_URL}"
else
  report "Starting BastillaOS API on port ${PORT}"
  npm run dev >.runtime/bastilla.log 2>&1 &
  pids+=("$!")
  if ! wait_http "${BASTILLA_API_URL%/}/api/ai/status" 45; then
    report "ERROR: BastillaOS API failed to start; see .runtime/bastilla.log"
    exit 1
  fi
fi
if [[ ! -x "$VENV/bin/python" ]]; then python3 -m venv "$VENV"; fi
"$VENV/bin/python" -m pip install -q -r integrations/mcp/requirements.txt
if (echo >/dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then
  report "ERROR: Port 8000 is already in use. Stop the existing service before starting a new MCP bridge."
  exit 1
fi
report "Starting loopback-only MCP bridge on port 8000"
"$VENV/bin/python" integrations/mcp/server.py >.runtime/mcp.log 2>&1 &
pids+=("$!")
for ((i=0;i<30;i++)); do
  if (echo >/dev/tcp/127.0.0.1/8000) >/dev/null 2>&1; then break; fi
  sleep 1
done
if ! "$VENV/bin/python" integrations/mcp/smoke_test.py; then
  report "ERROR: MCP smoke test failed; see .runtime/mcp.log"
  exit 1
fi
report "MCP OK (local): http://127.0.0.1:8000/mcp/"
report "Codespaces port 8000 must remain PRIVATE. ChatGPT cannot connect directly to a private Codespaces port."
report "Ollama diagnostics:"
curl -fsS --max-time 10 "${BASTILLA_API_URL%/}/api/ollama/models" || true
printf '\n'
report "Running; Ctrl+C stops processes started by this script. Do not publish ports 3000/8000 without authentication."
wait
