#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
codex_bin="$project_dir/.bastilla-tools/codex/node_modules/.bin/codex"
if [[ ! -x "$codex_bin" ]]; then
  printf '%s\n' 'Najpierw uruchom: npm run setup:codex' >&2
  exit 1
fi
exec "$codex_bin" "$@"
