#!/usr/bin/env bash
# Explicit, idempotent Debian 13 VM start for Codespaces or Docker hosts.
# Without /dev/kvm QEMU uses slow TCG software emulation.
set -Eeuo pipefail
cd "$(dirname "$0")/.."
LOG="${BASTILLA_VM_LOG:-/tmp/bastilla-vm-autostart.log}"
exec >>"$LOG" 2>&1
echo "[$(date -Is)] Checking VM prerequisites"
exec 9>/tmp/bastilla-vm-autostart.lock
flock -n 9 || exit 0
if ! command -v docker >/dev/null 2>&1 || ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon unavailable." >&2
  exit 1
fi
if ! docker compose version >/dev/null 2>&1; then
  echo "ERROR: Docker Compose v2 unavailable." >&2
  exit 1
fi
mkdir -p bastillaos/vm-gemini-4/data
chmod 700 bastillaos/vm-gemini-4/data
export VM_UID="$(id -u)" VM_GID="$(id -g)"
compose=(docker compose -p svl-vm-gemini-4 -f bastillaos/vm-gemini-4/compose.yaml)
if [[ -c /dev/kvm && -r /dev/kvm && -w /dev/kvm ]]; then
  export KVM_GID="$(stat -c %g /dev/kvm)"
  compose+=(-f bastillaos/vm-gemini-4/compose.kvm.yaml)
  echo "KVM device accessible; enabling hardware acceleration."
else
  echo "KVM unavailable; using QEMU TCG software emulation (slower)."
fi
"${compose[@]}" config --quiet
"${compose[@]}" up -d --build
"${compose[@]}" ps
echo "[$(date -Is)] VM container launched; Debian boot may still be in progress."
