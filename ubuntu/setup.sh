#!/usr/bin/env bash
set -Eeuo pipefail
if ! grep -qi 'ubuntu' /etc/os-release; then echo 'Requires Ubuntu' >&2; exit 1; fi
sudo apt-get update
sudo apt-get install -y ca-certificates curl jq python3 python3-venv
printf 'Ubuntu prerequisites installed. Ollama installation is a separate verified step.\n'
