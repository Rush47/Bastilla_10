#!/usr/bin/env bash
# Bastilla OS Debian 13 VM launcher for GitHub Codespaces.
# Creates a blank virtual disk and boots the official Debian 13 installer.
# It does NOT install BastillaOS inside Debian automatically.
set -Eeuo pipefail
VM_DIR="${VM_DIR:-$HOME/bastilla-vm}"
ISO="${DEBIAN_ISO:-$VM_DIR/debian-13-amd64-netinst.iso}"
DISK="$VM_DIR/bastilla-debian13.qcow2"
RAM_MB="${RAM_MB:-3072}"
CPUS="${CPUS:-2}"
mkdir -p "$VM_DIR"
echo "Checking KVM..."
if [[ -r /dev/kvm && -w /dev/kvm ]]; then
  ACCEL=kvm
else
  ACCEL=tcg
  echo "KVM unavailable; using slow software emulation (TCG)."
fi
if ! command -v qemu-system-x86_64 >/dev/null || ! command -v qemu-img >/dev/null; then
  echo "Install QEMU: sudo apt-get update && sudo apt-get install -y qemu-system-x86 qemu-utils"
  exit 1
fi
if [[ ! -f "$DISK" ]]; then
  qemu-img create -f qcow2 "$DISK" 32G
fi
ARGS=(-name BastillaOS-Debian13 -machine "q35,accel=$ACCEL" -m "$RAM_MB" -smp "$CPUS"
  -drive "file=$DISK,format=qcow2,if=virtio"
  -netdev user,id=net0 -device virtio-net-pci,netdev=net0
  -display none -vnc 127.0.0.1:1)
if [[ -f "$ISO" ]]; then
  ARGS+=(-cdrom "$ISO" -boot order=d)
  echo "Booting installer ISO: $ISO"
else
  echo "No installer ISO found at $ISO; booting existing disk."
  ARGS+=(-boot order=c)
fi
echo "VNC display: localhost:5901 (tunnel required; not publicly exposed)"
exec qemu-system-x86_64 "${ARGS[@]}"
