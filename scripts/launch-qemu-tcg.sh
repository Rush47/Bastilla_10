#!/usr/bin/env bash
# BastillaOS: launch an existing Debian 13 qcow2 disk without KVM.
set -Eeuo pipefail
if ! command -v qemu-system-x86_64 >/dev/null 2>&1; then
  echo "ERROR: qemu-system-x86_64 missing. Install qemu-system-x86." >&2; exit 1
fi
DISK="${1:-}"
if [[ -z "$DISK" || ! -f "$DISK" ]]; then
  echo "Usage: $0 /path/to/debian13.qcow2 [memory_mb] [cpus]" >&2; exit 2
fi
MEM="${2:-2048}"; CPUS="${3:-2}"
[[ "$MEM" =~ ^[0-9]+$ && "$CPUS" =~ ^[0-9]+$ ]] || { echo "Memory and CPU count must be integers" >&2; exit 2; }
echo "BastillaOS QEMU TCG: disk=$DISK memory=${MEM}MB cpus=$CPUS"
exec qemu-system-x86_64 -machine q35,accel=tcg -cpu max -smp "$CPUS" -m "$MEM" \
  -drive "file=$DISK,format=qcow2,if=virtio" -device virtio-net-pci,netdev=n0 \
  -netdev user,id=n0 -display none -serial mon:stdio -no-reboot
