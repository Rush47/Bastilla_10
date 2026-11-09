#!/usr/bin/env bash
# Restart local BastillaOS services if necessary and verify the four agent monitors.
# This does not claim inference or remote AI Studio connectivity.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
bash scripts/start-codespaces.sh
bash scripts/start-codespaces-mcp.sh
python3 - <<'PY'
import json, urllib.request, sys
url = "http://127.0.0.1:3000/api/agents/background/status"
with urllib.request.urlopen(url, timeout=8) as response:
    data = json.load(response)
agents = data.get("agents", {})
required = ("Aria", "Alex", "Astyria", "Aurelius")
missing = [name for name in required if name not in agents]
print("BastillaOS agent monitoring report")
for name in required:
    agent = agents.get(name, {})
    print(f"{name}: status={agent.get('status','missing')} enabled={agent.get('enabled',False)} lastCheck={agent.get('lastCheck')}")
print("Ollama model count:", data.get("ollama", {}).get("modelCount", "unknown"))
print("Note: 'online' indicates shared Ollama monitoring only, not individual agent inference.")
if missing:
    sys.exit("Missing configured agents: " + ", ".join(missing))
PY
if [[ -x .venv-mcp/bin/python ]]; then
  .venv-mcp/bin/python integrations/mcp/healthcheck.py
else
  echo "MCP virtual environment missing" >&2
  exit 1
fi
