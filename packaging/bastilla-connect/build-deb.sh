#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
command -v dpkg-deb >/dev/null || { echo "Install dpkg-dev" >&2; exit 1; }
command -v python3 >/dev/null || { echo "Install python3 and python3-venv" >&2; exit 1; }
version="0.1.0"
arch="$(dpkg --print-architecture)"
out="${1:-$PWD/dist}"
mkdir -p "$out"
out="$(cd "$out" && pwd)"
stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
mkdir -p "$stage/DEBIAN" "$stage/opt/bastilla-connect" "$stage/usr/bin" "$stage/lib/systemd/system" "$stage/etc/bastilla-connect"
cp integrations/mcp/client.py "$stage/opt/bastilla-connect/client.py"
cp packaging/bastilla-connect/connect.py "$stage/opt/bastilla-connect/connect.py"
python3 -m venv "$stage-build-venv"
"$stage-build-venv/bin/python" -m pip install --disable-pip-version-check --target "$stage/opt/bastilla-connect/vendor" -r integrations/mcp/requirements.txt
rm -rf "$stage-build-venv"
cat > "$stage/DEBIAN/control" <<EOF
Package: bastilla-connect
Version: $version
Section: net
Priority: optional
Architecture: $arch
Maintainer: BastillaOS Project <noreply@example.invalid>
Depends: ca-certificates, python3
Description: BastillaOS outbound API and MCP diagnostic client
 Runs outbound HTTPS API checks and optional MCP tool discovery.
EOF
install -m 0755 packaging/bastilla-connect/bastilla-connect "$stage/usr/bin/bastilla-connect"
install -m 0644 packaging/bastilla-connect/bastilla-connect.service "$stage/lib/systemd/system/"
install -m 0644 packaging/bastilla-connect/bastilla-connect.timer "$stage/lib/systemd/system/"
install -m 0644 packaging/bastilla-connect/config.env "$stage/etc/bastilla-connect/config.env"
chmod 0755 "$stage/DEBIAN"
dpkg-deb --build --root-owner-group "$stage" "$out/bastilla-connect_${version}_${arch}.deb"
echo "Built $out/bastilla-connect_${version}_${arch}.deb"
