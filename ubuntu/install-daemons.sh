#!/usr/bin/env bash
set -Eeuo pipefail
if [[ "$(id -u)" -ne 0 ]]; then echo "Run with sudo" >&2; exit 1; fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
install -d -o root -g root -m 0700 /var/lib/ubuntu-ai/daemons
install -d -o root -g root -m 0700 /etc/ubuntu-ai
install -D -o root -g root -m 0644 "$ROOT/ubuntu/systemd/ubuntu-ai-agent@.service" /etc/systemd/system/ubuntu-ai-agent@.service
systemctl daemon-reload
echo "Install project and Python venv in /opt/ubuntu-ai first."
echo "Then: sudo systemctl enable --now ubuntu-ai-agent@Aria ubuntu-ai-agent@Alex ubuntu-ai-agent@Astyria ubuntu-ai-agent@Aurelius"
