#!/usr/bin/env bash
# Ubuntu AI first-boot provisioning runner. Only explicitly registered setup tasks run.
set -Eeuo pipefail
BASE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
STATE_DIR="${UBUNTU_AI_STATE_DIR:-/var/lib/ubuntu-ai/setup}"
MANIFEST="$BASE/installer/setup-manifest.txt"
mkdir -p "$STATE_DIR"
exec 9>"$STATE_DIR/lock"
flock -n 9 || { echo "Setup already running"; exit 1; }
while IFS= read -r item || [ -n "$item" ]; do
  [[ -z "$item" || "$item" == \#* ]] && continue
  [[ "$item" =~ ^[a-zA-Z0-9_./-]+$ && "$item" != /* && "$item" != *..* ]] || { echo "Invalid task: $item" >&2; exit 1; }
  file="$BASE/$item"
  [ -f "$file" ] || { echo "Missing task: $item" >&2; exit 1; }
  key="$(printf '%s' "$item" | sha256sum | cut -d' ' -f1)"
  [ -f "$STATE_DIR/$key.done" ] && continue
  echo "Running $item"
  bash "$file"
  touch "$STATE_DIR/$key.done"
done < "$MANIFEST"
echo "All registered setup tasks completed."
