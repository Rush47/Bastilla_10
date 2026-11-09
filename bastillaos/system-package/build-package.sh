#!/usr/bin/env bash
set -Eeuo pipefail
umask 022

PACKAGE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$PACKAGE_DIR/../.." && pwd)"
OUTPUT_DIR="${OUTPUT_DIR:-$REPO_ROOT/bastillaos/build}"
SERVER_BUNDLE="${SERVER_BUNDLE:-$REPO_ROOT/bastillaos/build/server.mjs}"
WORK_DIR="$PACKAGE_DIR/.build-work"
PACKAGE_NAME=bastillaos-system
PACKAGE_VERSION=1.1.0
PACKAGE_ARCH=amd64
DEB_NAME="${PACKAGE_NAME}_${PACKAGE_VERSION}_${PACKAGE_ARCH}.deb"

fail() {
  printf 'build-package: %s\n' "$*" >&2
  exit 1
}

for tool in node dpkg-deb python3; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    fail "required build tool not found: $tool"
  fi
done

[[ -d "$REPO_ROOT/dist" ]] || fail "frontend dist/ is missing; run the frontend build first."
[[ -f "$REPO_ROOT/dist/index.html" ]] || fail "dist/index.html is missing; run the frontend build first."
[[ -d "$REPO_ROOT/node_modules" ]] || fail "node_modules/ is missing; run npm ci first."
[[ -f "$SERVER_BUNDLE" ]] || fail "production server bundle is missing: $SERVER_BUNDLE (run npm run build:server first)."
[[ -d "$REPO_ROOT/apps" ]] || fail "apps/ source data is missing."
[[ -f "$REPO_ROOT/svl_kernel.py" ]] || fail "svl_kernel.py is missing."
[[ -f "$REPO_ROOT/apps/without_nlp/engine.py" ]] || fail "apps/without_nlp/engine.py is missing."
[[ "$(node -p 'process.platform')" == linux && "$(node -p 'process.arch')" == x64 ]] \
  || fail "the BastillaOS ISO package target is Debian amd64; build on Linux x86_64."
[[ -n "$(node -p 'process.report.getReport().header.glibcVersionRuntime || ""')" ]] \
  || fail "the BastillaOS Debian package requires a glibc build environment."

rm -rf -- "$WORK_DIR"
trap 'rm -rf -- "$WORK_DIR"' EXIT HUP INT TERM
ROOT="$WORK_DIR/root"
RUNTIME="$ROOT/usr/lib/bastillaos/system"
DEFAULTS="$ROOT/usr/share/bastillaos/system-defaults"
DEBIAN="$ROOT/DEBIAN"
mkdir -p "$RUNTIME" "$DEFAULTS" "$DEBIAN" "$ROOT/usr/libexec/bastillaos" \
  "$ROOT/usr/lib/systemd/system" "$ROOT/usr/lib/bastillaos/without_nlp" "$ROOT/usr/bin"
chmod 0755 "$DEBIAN"

cp "$PACKAGE_DIR/debian/control" "$DEBIAN/control"
cp "$PACKAGE_DIR/debian/postinst" "$DEBIAN/postinst"
cp "$PACKAGE_DIR/debian/prerm" "$DEBIAN/prerm"
cp "$PACKAGE_DIR/debian/postrm" "$DEBIAN/postrm"
chmod 0755 "$DEBIAN/postinst" "$DEBIAN/prerm" "$DEBIAN/postrm"
cp "$PACKAGE_DIR/systemd/bastillaos-system.service" \
  "$ROOT/usr/lib/systemd/system/bastillaos-system.service"
cp "$PACKAGE_DIR/libexec/system-service" "$ROOT/usr/libexec/bastillaos/system-service"
chmod 0755 "$ROOT/usr/libexec/bastillaos/system-service"

# without_nlp: deterministic harmonic engine as a native system command.
cp "$REPO_ROOT/apps/without_nlp/engine.py" "$ROOT/usr/lib/bastillaos/without_nlp/engine.py"
cp "$PACKAGE_DIR/bin/without-nlp" "$ROOT/usr/bin/without-nlp"
chmod 0755 "$ROOT/usr/lib/bastillaos/without_nlp/engine.py" "$ROOT/usr/bin/without-nlp"

cp -a "$REPO_ROOT/dist" "$RUNTIME/dist"
cp "$SERVER_BUNDLE" "$RUNTIME/server.mjs"
node "$PACKAGE_DIR/pack-runtime-node-modules.cjs" \
  "$REPO_ROOT/node_modules" "$RUNTIME/node_modules"
node "$PACKAGE_DIR/check-runtime-deps.cjs" "$RUNTIME/node_modules"
node "$PACKAGE_DIR/pack-system-defaults.cjs" "$REPO_ROOT" "$DEFAULTS"

# Source checkout permissions can be permissive; ship root-owned, non-writable
# code and defaults while preserving executable bits for scripts.
find "$ROOT" -type d -exec chmod 0755 {} +
find "$ROOT" -type f -perm /111 -exec chmod 0755 {} +
find "$ROOT" -type f ! -perm /111 -exec chmod 0644 {} +

mkdir -p "$OUTPUT_DIR"
DEB_PATH="$OUTPUT_DIR/$DEB_NAME"
dpkg-deb --root-owner-group --build -Zxz -z1 "$ROOT" "$DEB_PATH"

dpkg-deb --info "$DEB_PATH" >/dev/null || fail "dpkg-deb rejected the built package."
[[ "$(dpkg-deb --field "$DEB_PATH" Package)" == "$PACKAGE_NAME" ]] \
  || fail "built .deb has an unexpected package name."
[[ "$(dpkg-deb --field "$DEB_PATH" Version)" == "$PACKAGE_VERSION" ]] \
  || fail "built .deb has an unexpected version."
[[ "$(dpkg-deb --field "$DEB_PATH" Architecture)" == "$PACKAGE_ARCH" ]] \
  || fail "built .deb has an unexpected architecture."

VERIFY_DIR="$WORK_DIR/verify"
mkdir -p "$VERIFY_DIR"
dpkg-deb --extract "$DEB_PATH" "$VERIFY_DIR"
for required_file in \
  usr/lib/bastillaos/system/server.mjs \
  usr/lib/bastillaos/system/dist/index.html \
  usr/lib/bastillaos/system/node_modules/express/package.json \
  usr/lib/bastillaos/system/node_modules/vite/package.json \
  usr/libexec/bastillaos/system-service \
  usr/lib/systemd/system/bastillaos-system.service \
  usr/lib/bastillaos/without_nlp/engine.py \
  usr/bin/without-nlp \
  usr/share/bastillaos/system-defaults/apps/without_nlp/engine.py \
  usr/share/bastillaos/system-defaults/.gitignore \
  usr/share/bastillaos/system-defaults/src/App.tsx \
  usr/share/bastillaos/system-defaults/apps/matrix-telemetry/app.json \
  usr/share/bastillaos/system-defaults/.github/workflows/build-bastillaos.yml; do
  [[ -f "$VERIFY_DIR/$required_file" ]] || fail "built .deb is missing $required_file."
done
if find "$VERIFY_DIR/usr/share/bastillaos/system-defaults" \
  \( -type d \( -name .git -o -name node_modules -o -name dist -o -name build \) \
  -o -type f \( -name '.env*' -o -name '.github_credentials.json' -o -name svl_datastore.json \) \) \
  -print -quit | grep -q .; then
  fail "built .deb contains a forbidden source/runtime artifact."
fi
if find "$VERIFY_DIR" -type f -perm /002 -print -quit | grep -q .; then
  fail "built .deb contains world-writable files."
fi

engine_check="$(python3 -I "$VERIFY_DIR/usr/lib/bastillaos/without_nlp/engine.py" BASTILLA)" \
  || fail "packaged without_nlp engine does not run."
grep -q '"decoded_text": "BASTILLA"' <<<"$engine_check" \
  || fail "packaged without_nlp engine did not decode losslessly."

printf 'Built and validated %s\n' "$DEB_PATH"
