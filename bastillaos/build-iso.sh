#!/usr/bin/env bash
set -Eeuo pipefail

BASTILLA_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd -- "$BASTILLA_DIR/.." && pwd)"
BUILD_DIR="${BUILD_DIR:-$BASTILLA_DIR/build}"
PACKAGE_DIR="$BUILD_DIR/packages.chroot"
WORK_DIR=''

for tool in docker npm node dpkg-deb sha256sum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    printf 'Required build tool not found: %s\n' "$tool" >&2
    exit 1
  fi
done

if [ ! -f "$BASTILLA_DIR/live-build/auto/config" ]; then
  printf 'Missing Debian live-build configuration: %s\n' "$BASTILLA_DIR/live-build/auto/config" >&2
  exit 1
fi
if [ ! -f "$BASTILLA_DIR/system-package/build-package.sh" ]; then
  printf 'Missing system package builder: %s\n' "$BASTILLA_DIR/system-package/build-package.sh" >&2
  exit 1
fi
if [ ! -d "$BASTILLA_DIR/branding/usr/share" ]; then
  printf 'Missing BastillaOS KDE branding files: %s\n' "$BASTILLA_DIR/branding" >&2
  exit 1
fi
if [ ! -d "$BASTILLA_DIR/security/includes.chroot" ]; then
  printf 'Missing BastillaOS security defaults: %s\n' "$BASTILLA_DIR/security/includes.chroot" >&2
  exit 1
fi

rm -rf -- "$PACKAGE_DIR"
mkdir -p "$BUILD_DIR" "$PACKAGE_DIR"

cd "$REPO_ROOT"
npm ci
npm run build
npm run build:server

OUTPUT_DIR="$PACKAGE_DIR" bash "$BASTILLA_DIR/system-package/build-package.sh"

mapfile -t packages < <(find "$PACKAGE_DIR" -maxdepth 1 -type f -name '*.deb' -print | sort)
if [ "${#packages[@]}" -ne 1 ]; then
  printf 'Expected exactly one BastillaOS system package in %s; found %s.\n' \
    "$PACKAGE_DIR" "${#packages[@]}" >&2
  exit 1
fi

WORK_DIR="$(mktemp -d "${TMPDIR:-/tmp}/bastillaos-live.XXXXXX")"
cleanup() {
  if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then
    if [ "${BUILD_SUCCEEDED:-0}" = 1 ]; then
      # live-build ran as root, so remove its root-owned files from a container.
      docker run --rm --mount "type=bind,source=$WORK_DIR,target=/build" \
        bastillaos-live-builder:debian13 find /build -mindepth 1 -delete >/dev/null 2>&1 || true
      rm -rf -- "$WORK_DIR"
    else
      printf 'ISO build failed; temporary live-build tree retained at %s\n' "$WORK_DIR" >&2
    fi
  fi
}
trap cleanup EXIT

cp -a "$BASTILLA_DIR/live-build/." "$WORK_DIR/"
mkdir -p "$WORK_DIR/config/includes.chroot" "$WORK_DIR/config/packages.chroot"
cp -a "$BASTILLA_DIR/branding/." "$WORK_DIR/config/includes.chroot/"
cp -a "$BASTILLA_DIR/security/includes.chroot/." "$WORK_DIR/config/includes.chroot/"
install -m 0644 "${packages[0]}" "$WORK_DIR/config/packages.chroot/"

docker build \
  --pull \
  --file "$BASTILLA_DIR/Dockerfile.builder" \
  --tag bastillaos-live-builder:debian13 \
  "$BASTILLA_DIR"

docker run --rm --privileged \
  --mount "type=bind,source=$WORK_DIR,target=/build" \
  --workdir /build \
  bastillaos-live-builder:debian13 \
  bash -Eeuc 'bash ./auto/config; if [ -f ./auto/build ]; then bash ./auto/build; else lb build; fi'

mapfile -t images < <(find "$WORK_DIR" -maxdepth 1 -type f -name '*.iso' -print | sort)
if [ "${#images[@]}" -ne 1 ]; then
  printf 'Expected exactly one ISO image; found %s.\n' "${#images[@]}" >&2
  exit 1
fi

ISO_OUTPUT="$BUILD_DIR/BastillaOS-13-amd64.iso"
install -m 0644 "${images[0]}" "$ISO_OUTPUT"
(
  cd "$BUILD_DIR"
  sha256sum "$(basename "$ISO_OUTPUT")" > "$(basename "$ISO_OUTPUT").sha256"
)

BUILD_SUCCEEDED=1
printf '\nBastillaOS ISO ready:\n  %s\n' "$ISO_OUTPUT"
printf 'SHA-256:\n'
cat "$ISO_OUTPUT.sha256"
