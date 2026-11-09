#!/usr/bin/env bash
set -euo pipefail
# Build a Debian package for BastillaOS Connect; no root required to build.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
VERSION="0.1.0"
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/pkg"
mkdir -p "$PKG/DEBIAN" "$PKG/usr/lib/bastilla-connect" "$PKG/usr/bin" "$PKG/lib/systemd/system" "$ROOT/dist"
cp "$ROOT/integrations/mcp/client.py" "$PKG/usr/lib/bastilla-connect/client.py"
cat > "$PKG/usr/bin/bastilla-connect" <<'EOF'
#!/usr/bin/env bash
set -euo pipefail
if [[ ! -x /opt/bastilla-connect/venv/bin/python ]]; then
  echo "Missing Python MCP dependencies; see integrations/mcp/CONNECT.md" >&2
  exit 2
fi
exec /opt/bastilla-connect/venv/bin/python /usr/lib/bastilla-connect/client.py "$@"
EOF
chmod 755 "$PKG/usr/bin/bastilla-connect"
cat > "$PKG/DEBIAN/control" <<EOF
Package: bastilla-connect
Version: $VERSION
Section: net
Priority: optional
Architecture: all
Maintainer: BastillaOS Project <noreply@example.invalid>
Depends: python3 (>= 3.10), python3-venv
Description: BastillaOS outbound MCP diagnostic client
 Read-only MCP diagnostic client for approved remote servers.
 Requires Python MCP SDK installed separately in a dedicated virtualenv.
EOF
cat > "$PKG/lib/systemd/system/bastilla-connect.service" <<'EOF'
[Unit]
Description=BastillaOS MCP connectivity probe
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
User=nobody
EnvironmentFile=/etc/bastilla-connect.env
ExecStart=/usr/bin/bastilla-connect
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true

[Install]
WantedBy=multi-user.target
EOF
dpkg-deb --build --root-owner-group "$PKG" "$ROOT/dist/bastilla-connect_${VERSION}_all.deb"
echo "Built dist/bastilla-connect_${VERSION}_all.deb"
