#!/usr/bin/env bash
# Build an edited Linux kernel in a separate directory. Does not install or reboot.
set -Eeuo pipefail
if [[ $# -lt 1 || $# -gt 2 ]]; then
  echo "Usage: bash ubuntu/build-kernel.sh /path/to/linux-git-checkout [output-dir]" >&2
  exit 2
fi
TREE="$(realpath -e "$1")"
[[ -d "$TREE/.git" && -f "$TREE/Makefile" ]] || { echo "Kernel Git checkout required" >&2; exit 1; }
OUT="${2:-$HOME/ubuntu-ai-kernel-build}"
mkdir -p "$OUT"
OUT="$(realpath -e "$OUT")"
if [[ "$OUT" == "$TREE" || "$OUT" == "$TREE/"* ]]; then
  echo "Build directory must be outside source tree" >&2; exit 1
fi
for cmd in make gcc git; do command -v "$cmd" >/dev/null || { echo "Missing $cmd" >&2; exit 1; }; done
echo "Kernel tree: $TREE"
echo "Output: $OUT"
git -C "$TREE" status --short
echo "This may require Ubuntu packages: build-essential bc bison flex libssl-dev libelf-dev dwarves"
echo "Kernel configuration and build are NOT an installation."
read -r -p "Type BUILD to configure and compile: " choice
[[ "$choice" == "BUILD" ]] || { echo "Cancelled"; exit 0; }
make -C "$TREE" O="$OUT" defconfig
make -C "$TREE" O="$OUT" -j"${JOBS:-2}"
echo "Build finished. No modules installed, no bootloader modified, no reboot."
