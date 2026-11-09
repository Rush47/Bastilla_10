#!/bin/sh
set -eu

PACKAGE_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPO_ROOT=$(CDPATH= cd -- "$PACKAGE_DIR/../.." && pwd)
WORK_DIR="$PACKAGE_DIR/.test-work"
SERVER_PID=
cleanup() {
  if [ -n "$SERVER_PID" ]; then
    kill "$SERVER_PID" 2>/dev/null || true
    wait "$SERVER_PID" 2>/dev/null || true
  fi
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT HUP INT TERM
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR/out" "$WORK_DIR/build"

if [ ! -d "$REPO_ROOT/node_modules" ]; then
  echo "test-package: node_modules/ is missing; run npm ci first." >&2
  exit 1
fi
if [ -z "${SERVER_BUNDLE:-}" ]; then
  [ -x "$REPO_ROOT/node_modules/.bin/esbuild" ] || {
    echo "test-package: esbuild is missing; run npm ci or set SERVER_BUNDLE." >&2
    exit 1
  }
  "$REPO_ROOT/node_modules/.bin/esbuild" "$REPO_ROOT/server.ts" \
    --bundle --platform=node --format=esm --packages=external --target=node20 \
    --outfile="$WORK_DIR/build/server.mjs"
  SERVER_BUNDLE="$WORK_DIR/build/server.mjs"
fi
SERVER_BUNDLE="$SERVER_BUNDLE" OUTPUT_DIR="$WORK_DIR/out" \
  "$PACKAGE_DIR/build-package.sh"
DEB="$WORK_DIR/out/bastillaos-system_1.1.0_amd64.deb"
[ -f "$DEB" ] || { echo "test-package: package was not built." >&2; exit 1; }

PACKAGE_INFO=$(dpkg-deb -f "$DEB")
printf '%s\n' "$PACKAGE_INFO" | grep -q '^Package: bastillaos-system$'
printf '%s\n' "$PACKAGE_INFO" | grep -q '^Architecture: amd64$'
printf '%s\n' "$PACKAGE_INFO" | grep -q 'nodejs (>= 20)'
printf '%s\n' "$PACKAGE_INFO" | grep -q 'git'
printf '%s\n' "$PACKAGE_INFO" | grep -q 'tar'

mkdir -p "$WORK_DIR/unpacked"
dpkg-deb -x "$DEB" "$WORK_DIR/unpacked"
ROOT="$WORK_DIR/unpacked"
for required in \
  usr/lib/bastillaos/system/server.mjs \
  usr/lib/bastillaos/system/dist/index.html \
  usr/lib/bastillaos/system/node_modules/express/package.json \
  usr/lib/bastillaos/system/node_modules/vite/package.json \
  usr/libexec/bastillaos/system-service \
  usr/lib/systemd/system/bastillaos-system.service \
  usr/lib/bastillaos/without_nlp/engine.py \
  usr/bin/without-nlp \
  usr/share/bastillaos/system-defaults/apps/without_nlp/engine.py \
  usr/share/bastillaos/system-defaults/svl_kernel.py \
  usr/share/bastillaos/system-defaults/apps/matrix-telemetry/app.json \
  usr/share/bastillaos/system-defaults/src/App.tsx \
  usr/share/bastillaos/system-defaults/bastillaos/system-package/build-package.sh \
  usr/share/bastillaos/system-defaults/server.ts \
  usr/share/bastillaos/system-defaults/package.json \
  usr/share/bastillaos/system-defaults/package-lock.json \
  usr/share/bastillaos/system-defaults/index.html \
  usr/share/bastillaos/system-defaults/README.md \
  usr/share/bastillaos/system-defaults/.github/workflows/build-bastillaos.yml \
  usr/share/bastillaos/system-defaults/.gitignore; do
  [ -f "$ROOT/$required" ] || { echo "test-package: missing $required" >&2; exit 1; }
done

DEFAULTS="$ROOT/usr/share/bastillaos/system-defaults"
[ -x "$ROOT/usr/bin/without-nlp" ]
grep -q '/usr/lib/bastillaos/without_nlp/engine.py' "$ROOT/usr/bin/without-nlp"
WITHOUT_NLP_OUT=$(python3 -I "$ROOT/usr/lib/bastillaos/without_nlp/engine.py" --omega 2 --t 0.5 'Zażółć 🚀')
printf '%s\n' "$WITHOUT_NLP_OUT" | python3 -c '
import json, sys
d = json.load(sys.stdin)
assert d["decoded_text"] == "Zażółć 🚀", d["decoded_text"]
assert d["error_rate"] == 0.0 and d["fundamental_omega"] == 2.0 and d["harmonics"]
'
python3 -I "$ROOT/usr/lib/bastillaos/without_nlp/engine.py" --status | grep -q '"ACTIVE_PURE_MATH"'
! find "$DEFAULTS" \( -path '*/windows-update-agent/*' -o -name 'WindowsUpdateView.tsx' -o -name 'BastillaWindowsUpdateAgent.ps1' \) | grep -q .
! find "$DEFAULTS" \( -type d \( -name .git -o -name node_modules -o -name dist -o -name build \) \
  -o -type f \( -name '.env*' -o -name '.github_credentials.json' -o -name 'svl_datastore.json' \) \) | grep -q .
grep -q '^exports/svl_datastore.json$' "$DEFAULTS/.gitignore"
! grep -q 'package-lock.json' "$DEFAULTS/.gitignore"
SERVICE="$ROOT/usr/lib/systemd/system/bastillaos-system.service"
grep -q '^User=root$' "$SERVICE"
grep -q '^Group=root$' "$SERVICE"
grep -q '^WorkingDirectory=/var/lib/bastillaos/system$' "$SERVICE"
grep -q '^Environment=NODE_ENV=production$' "$SERVICE"
grep -q '^Environment=HOST=127.0.0.1$' "$SERVICE"
grep -q '^Environment=PORT=3000$' "$SERVICE"
grep -q '^EnvironmentFile=-/etc/bastillaos/system.env$' "$SERVICE"
grep -q '^StateDirectory=bastillaos/system$' "$SERVICE"
awk '
  /^EnvironmentFile=/ { environment_file = NR }
  /^Environment=HOST=127\.0\.0\.1$/ { loopback_host = NR }
  END { exit !(environment_file && loopback_host && environment_file < loopback_host) }
' "$SERVICE"
! grep -q '^NoNewPrivileges=true$' "$SERVICE"
! grep -q '^ProtectHome=true$' "$SERVICE"
! grep -q '^ProtectSystem=strict$' "$SERVICE"
! grep -q '^ReadWritePaths=' "$SERVICE"
grep -q 'restart bastillaos-system.service' "$PACKAGE_DIR/debian/postinst"
grep -q '^After=.*network-online.target.*NetworkManager-wait-online.service' "$SERVICE"
grep -q '^Restart=on-failure$' "$SERVICE"
test -x "$ROOT/usr/libexec/bastillaos/system-service"
! find "$ROOT" \( -type d -name .git -o -type f \( -name '.env*' -o -name '.github_credentials.json' -o -name svl_datastore.json \) \) | grep -q .
! find "$ROOT" -type f -name '*.desktop' | grep -q .
! find "$ROOT" -type f -perm /002 | grep -q .
! find "$ROOT/usr/lib/bastillaos/system/node_modules" -maxdepth 1 -type d \
  \( -name react -o -name three -o -name typescript \) | grep -q .
! find "$ROOT/usr/lib/bastillaos/system/node_modules" -type d -name '*-musl' | grep -q .

RUNTIME="$ROOT/usr/lib/bastillaos/system"
STATE="$WORK_DIR/state"
mkdir -p "$STATE/exports" "$STATE/apps"
printf '%s\n' 'user datastore must persist' > "$STATE/exports/svl_datastore.json"
printf '%s\n' 'user-owned app' > "$STATE/apps/custom-app.txt"
BASTILLAOS_DEFAULTS_DIR="$DEFAULTS" \
BASTILLAOS_RUNTIME_DIR="$RUNTIME" \
BASTILLAOS_STATE_DIR="$STATE" \
BASTILLAOS_SKIP_EXEC=1 \
  "$ROOT/usr/libexec/bastillaos/system-service"
grep -q 'user datastore must persist' "$STATE/exports/svl_datastore.json"
grep -q 'user-owned app' "$STATE/apps/custom-app.txt"
[ -f "$STATE/apps/matrix-telemetry/app.json" ]
[ -f "$STATE/svl_kernel.py" ]
[ -L "$STATE/dist" ]
printf '%s\n' 'new package default' > "$DEFAULTS/exports/new-default.txt"
printf '%s\n' 'updated shipped datastore' > "$DEFAULTS/exports/svl_datastore.json"
BASTILLAOS_DEFAULTS_DIR="$DEFAULTS" \
BASTILLAOS_RUNTIME_DIR="$RUNTIME" \
BASTILLAOS_STATE_DIR="$STATE" \
BASTILLAOS_SKIP_EXEC=1 \
  "$ROOT/usr/libexec/bastillaos/system-service"
grep -q 'user datastore must persist' "$STATE/exports/svl_datastore.json"
[ -f "$STATE/exports/new-default.txt" ]
[ -w "$STATE/exports/svl_datastore.json" ]

PORT=42117
NODE_ENV=production HOST=127.0.0.1 PORT="$PORT" LLM_PROVIDERS=none CHAT_LOCAL_FALLBACK=on \
BASTILLAOS_DEFAULTS_DIR="$DEFAULTS" \
BASTILLAOS_RUNTIME_DIR="$RUNTIME" \
BASTILLAOS_STATE_DIR="$STATE" \
  "$ROOT/usr/libexec/bastillaos/system-service" > "$WORK_DIR/server.log" 2>&1 &
SERVER_PID=$!
READY=0
attempt=0
while [ "$attempt" -lt 30 ]; do
  if node -e "fetch('http://127.0.0.1:$PORT/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"; then
    READY=1
    break
  fi
  if ! kill -0 "$SERVER_PID" 2>/dev/null; then
    cat "$WORK_DIR/server.log" >&2
    echo "test-package: production server exited before becoming ready." >&2
    exit 1
  fi
  attempt=$((attempt + 1))
  sleep 1
done
[ "$READY" -eq 1 ] || { cat "$WORK_DIR/server.log" >&2; echo "test-package: server did not become ready." >&2; exit 1; }
node -e "
(async () => {
  const baseUrl = 'http://127.0.0.1:$PORT';
  const statusResponse = await fetch(baseUrl + '/api/ai/status');
  const status = await statusResponse.json();
  if (
    !statusResponse.ok ||
    typeof status.enabled !== 'boolean' ||
    status.provider !== (status.enabled ? 'Google Gemini API' : 'disabled') ||
    status.connection !== (status.enabled ? 'configured' : 'disabled') ||
    status.protocol !== '/api/triad/command' ||
    status.chatProtocol !== '/api/triad/message' ||
    'apiKey' in status ||
    'model' in status
  ) {
    throw new Error('text model status does not accurately report Gemini chat configuration');
  }

  for (const route of ['/api/kernel/agent', '/api/terminal/generate-script']) {
    const response = await fetch(baseUrl + route, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'free text must remain disabled' }),
    });
    if (response.status !== 410) {
      throw new Error(route + ' must return HTTP 410');
    }
  }

  const protocolResponse = await fetch(baseUrl + '/api/triad/command', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ command: 'SYSTEM_STATUS', agent: 'triad' }),
  });
  const protocol = await protocolResponse.json();
  if (
    !protocolResponse.ok ||
    protocol.success !== true ||
    !protocol.triad ||
    !protocol.replies?.Alex ||
    !protocol.replies?.Astyria ||
    !protocol.replies?.Aurelius
  ) {
    throw new Error('deterministic Triad command failed');
  }

  const missionResponse = await fetch(baseUrl + '/api/astyria/mission', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'deep_scan' }),
  });
  const mission = await missionResponse.json();
  const astyriaReplyPersisted = mission.state?.store?.chat_history?.some(
    message => message.agent === 'Astyria' && message.tekst === mission.reply
  );
  if (
    !missionResponse.ok ||
    mission.success !== true ||
    typeof mission.reply !== 'string' ||
    !astyriaReplyPersisted
  ) {
    throw new Error('Astyria mission did not return and persist its reply in chat history');
  }

  const messageText = 'Wiadomość smoke-test: Zażółć gęślą jaźń.';
  const messageResponse = await fetch(baseUrl + '/api/triad/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: messageText }),
  });
  const messageResult = await messageResponse.json();
  const messagePersisted = messageResult.state?.store?.chat_history?.some(
    message => message.agent === 'Mateusz Mitek' && message.tekst === messageText
  );
  const deterministicReplyPersisted = messageResult.state?.store?.chat_history?.some(
    message => message.agent === 'Astyria' && message.tekst === messageResult.reply
  );
  if (
    !messageResponse.ok ||
    messageResult.success !== true ||
    !messageResult.reply?.includes('nie jest interpretowana językowo') ||
    messageResult.analysis?.decodedText !== messageText ||
    !messagePersisted ||
    !deterministicReplyPersisted
  ) {
    throw new Error('without_nlp chat did not analyze and persist both sides of the message');
  }

  const emptyMessageResponse = await fetch(baseUrl + '/api/triad/message', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: '   ' }),
  });
  if (emptyMessageResponse.status !== 400) {
    throw new Error('without_nlp chat must reject empty messages');
  }

  const createPythonResponse = await fetch(baseUrl + '/api/apps/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 'smoke-python', type: 'python-microservice' }),
  });
  if (!createPythonResponse.ok) {
    throw new Error('Python application fixture could not be created');
  }

  try {
    const pythonPreviewResponse = await fetch(baseUrl + '/api/apps/preview/smoke-python/');
    const pythonPreview = await pythonPreviewResponse.text();
    if (!pythonPreviewResponse.ok || !pythonPreview.includes('Mikroserwis Python')) {
      throw new Error('Python application preview did not load its HTML entrypoint');
    }
  } finally {
    await fetch(baseUrl + '/api/apps/smoke-python', { method: 'DELETE' });
  }

  const assetResponse = await fetch(baseUrl + '/api/apps/preview/matrix-telemetry/index.html');
  const assetHtml = await assetResponse.text();
  if (!assetResponse.ok || !assetHtml.includes('ASTYRIA QUANTUM TELEMETRY')) {
    throw new Error('application preview asset route did not serve the app file');
  }

  const launchResponse = await fetch(baseUrl + '/api/apps/matrix-telemetry/launch', { method: 'POST' });
  const launch = await launchResponse.json();
  if (
    !launchResponse.ok ||
    launch.success !== true ||
    launch.status !== 'running' ||
    launch.previewUrl !== '/api/apps/preview/matrix-telemetry/'
  ) {
    throw new Error('application launch endpoint did not return a working preview');
  }

  const missingLaunchResponse = await fetch(baseUrl + '/api/apps/not-installed/launch', { method: 'POST' });
  if (missingLaunchResponse.status !== 404) {
    throw new Error('launch endpoint must report missing applications');
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
"
kill "$SERVER_PID"
wait "$SERVER_PID" 2>/dev/null || true
SERVER_PID=

echo "Package build and contents test passed."
