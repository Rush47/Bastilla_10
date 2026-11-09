#!/usr/bin/env bash
# Install the Ubuntu AI backend and five local observation daemons.
# Ollama binary is installed separately from the official Linux distribution.
set -Eeuo pipefail
if (( EUID != 0 )); then echo "Run with sudo: sudo bash ubuntu/install-production.sh" >&2; exit 1; fi
. /etc/os-release
if [[ "${ID:-}" != "ubuntu" ]]; then echo "Ubuntu required" >&2; exit 1; fi
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y python3 python3-venv python3-pip ca-certificates curl
if ! id System >/dev/null 2>&1; then
  useradd --badname --create-home --shell /bin/bash System
  echo "Created Linux user System; set a password with: sudo passwd System"
fi
usermod -aG sudo System
install -d -o root -g root -m 0755 /opt/ubuntu-ai
cp -a "$ROOT/ubuntu" /opt/ubuntu-ai/
python3 -m venv /opt/ubuntu-ai/.venv
/opt/ubuntu-ai/.venv/bin/python -m pip install --disable-pip-version-check -r /opt/ubuntu-ai/ubuntu/requirements.txt
install -d -o root -g root -m 0700 /var/lib/ubuntu-ai/daemons /etc/ubuntu-ai
if [[ ! -e /etc/ubuntu-ai/daemon.env ]]; then
  printf 'OLLAMA_BASE_URL=http://127.0.0.1:11434\nOLLAMA_MODEL=dolphin3:8b\nOLLAMA_FALLBACK_MODEL=gemma4-e4b-ultra-uncensored\nDAEMON_DATA_DIR=/var/lib/ubuntu-ai/daemons\n' > /etc/ubuntu-ai/daemon.env
  chmod 0600 /etc/ubuntu-ai/daemon.env
fi
# Upgrade an existing installation to the required uncensored model without removing other settings.
if grep -q "^OLLAMA_MODEL=" /etc/ubuntu-ai/daemon.env; then
  sed -i "s/^OLLAMA_MODEL=.*/OLLAMA_MODEL=dolphin3:8b/" /etc/ubuntu-ai/daemon.env
else
  printf '\nOLLAMA_MODEL=dolphin3:8b\n' >> /etc/ubuntu-ai/daemon.env
fi
if ! grep -q "^OLLAMA_FALLBACK_MODEL=" /etc/ubuntu-ai/daemon.env; then
  printf '\nOLLAMA_FALLBACK_MODEL=gemma4-e4b-ultra-uncensored\n' >> /etc/ubuntu-ai/daemon.env
fi
chmod 0600 /etc/ubuntu-ai/daemon.env
install -m 0644 /opt/ubuntu-ai/ubuntu/systemd/ubuntu-ai-agent@.service /etc/systemd/system/ubuntu-ai-agent@.service
install -m 0644 /opt/ubuntu-ai/ubuntu/systemd/ubuntu-ai-api.service /etc/systemd/system/ubuntu-ai-api.service
systemctl daemon-reload
for agent in Aria Alex Astyria Aurelius System; do
  systemctl enable --now "ubuntu-ai-agent@${agent}.service"
done
systemctl enable --now ubuntu-ai-api.service
if command -v ollama >/dev/null 2>&1; then
  systemctl enable --now ollama.service
  if [[ "${PULL_OLLAMA_MODEL:-1}" == "1" ]]; then
    ollama pull dolphin3:8b
  fi
else
  echo "Ollama not installed; install from https://ollama.com/download/linux and run: ollama pull dolphin3:8b"
fi
systemctl restart ubuntu-ai-api.service
echo "Ubuntu AI installed. Local API: http://127.0.0.1:8000/api/health"
echo "Agent System uses Ollama after the Ollama service and selected model are installed."
echo "Linux admin account System is present. To enable password login: sudo passwd System"
