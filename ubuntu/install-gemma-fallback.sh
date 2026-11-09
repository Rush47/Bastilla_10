#!/usr/bin/env bash
# Register the user-supplied Gemma 4 E4B Ultra Uncensored GGUF as an Ollama fallback.
set -Eeuo pipefail
GGUF="${1:-}"
if [[ -z "$GGUF" || ! -f "$GGUF" || "${GGUF##*.}" != gguf ]]; then
  echo "Usage: bash ubuntu/install-gemma-fallback.sh /absolute/path/to/model.gguf" >&2
  exit 2
fi
if ! command -v ollama >/dev/null 2>&1; then
  echo "Install Ollama first." >&2
  exit 1
fi
MODEL_NAME="gemma4-e4b-ultra-uncensored"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
printf 'FROM %s\n' "$(realpath "$GGUF")" > "$TMP/Modelfile"
ollama create "$MODEL_NAME" -f "$TMP/Modelfile"
echo "Fallback installed: $MODEL_NAME"
echo "Restart ubuntu-ai-api.service to load environment changes if necessary."
