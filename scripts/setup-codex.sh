#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
codex_dir="$project_dir/.bastilla-tools/codex"
npm install --prefix "$codex_dir" --no-audit --no-fund @openai/codex
"$codex_dir/node_modules/.bin/codex" --version
printf '%s\n' 'Codex CLI zainstalowany. Sprawdź: npm run codex -- login status' 'Logowanie wykonaj osobiście: npm run codex -- login --device-auth'
