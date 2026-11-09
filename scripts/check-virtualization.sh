#!/usr/bin/env bash
# BastillaOS virtualization diagnostics: safe, read-only host capability check.
set -u
echo "=== BastillaOS virtualization diagnostics ==="
echo "Date (UTC): $(date -u +%FT%TZ)"
echo "Kernel: $(uname -srmo)"
echo "Architecture: $(uname -m)"
if [ -e /dev/kvm ]; then
  echo "KVM device: present"
  if [ -r /dev/kvm ] && [ -w /dev/kvm ]; then echo "KVM access: read/write"; else echo "KVM access: restricted"; fi
else
  echo "KVM device: absent (TCG fallback required)"
fi
for tool in qemu-system-x86_64 qemu-img docker; do
  if command -v "$tool" >/dev/null 2>&1; then
    echo "$tool: $(command -v "$tool")"
  else
    echo "$tool: not installed"
  fi
done
if command -v qemu-system-x86_64 >/dev/null 2>&1; then
  qemu-system-x86_64 --version | head -n 1
  echo "TCG acceleration availability:"
  qemu-system-x86_64 -accel help 2>&1 | grep -E '(^tcg$|^kvm$)' || true
fi
echo "=== End of diagnostics ==="
