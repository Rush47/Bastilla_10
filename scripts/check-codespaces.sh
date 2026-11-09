#!/usr/bin/env bash
# Read-only diagnostics for BastillaOS in Codespaces. No credentials or private keys printed.
set -uo pipefail
cd "$(dirname "$0")/.."
PORT="${PORT:-3000}"
if [[ ! "$PORT" =~ ^[0-9]+$ ]] || (( PORT < 1 || PORT > 65535 )); then
  echo "Invalid PORT; expected an integer from 1 to 65535" >&2
  exit 2
fi
failures=0
check() {
  local name="$1"
  shift
  if "$@" >/dev/null 2>&1; then
    printf 'PASS %s\n' "$name"
  else
    printf 'FAIL %s\n' "$name"
    failures=$((failures + 1))
  fi
}
check 'Node.js available' command -v node
check 'Python available' command -v python3
check 'npm available' command -v npm
check 'Dependencies installed' test -d node_modules
check_json_endpoint() {
  local url="$1"
  local required_key="$2"
  local required_type="$3"
  local payload
  payload="$(curl -fsS --max-time 5 "$url")" || return 1
  printf '%s' "$payload" | node -e '
    let raw="";
    process.stdin.on("data", chunk => raw += chunk);
    process.stdin.on("end", () => {
      try {
        const data=JSON.parse(raw);
        if (!data || typeof data !== "object" || Array.isArray(data) || typeof data[process.argv[1]] !== process.argv[2]) process.exit(1);
      } catch { process.exit(1); }
    });
  ' "$required_key" "$required_type"
}
check 'BastillaOS HTTP metrics JSON' check_json_endpoint "http://127.0.0.1:${PORT}/api/system/metrics" cpuCores number
check 'BastillaOS AI status JSON' check_json_endpoint "http://127.0.0.1:${PORT}/api/ai/status" protocol string
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
  echo 'PASS Docker daemon accessible (optional for web app)'
else
  echo 'INFO Docker daemon unavailable (web app can still run)'
fi
if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  echo 'PASS Docker Compose accessible (optional for web app)'
else
  echo 'INFO Docker Compose unavailable (web app can still run)'
fi
if [[ -c /dev/kvm && -r /dev/kvm && -w /dev/kvm ]]; then
  echo 'INFO KVM available'
else
  echo 'INFO KVM unavailable: Debian guest requires QEMU TCG software emulation'
fi
echo "RESULT: $failures failed required web checks"
if (( failures > 0 )); then
  echo 'Review /tmp/svl.log and /tmp/bastilla-codespaces.log for startup diagnostics.'
  exit 1
fi
