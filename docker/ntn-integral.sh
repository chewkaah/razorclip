#!/usr/bin/env sh
set -eu

# Integral Notion CLI wrapper for Razorclip/Paperclip agents.
# Loads token-based Notion auth from Paperclip secrets without exposing secrets in prompts.
SECRET_FILE="${NOTION_SECRET_FILE:-/paperclip/instances/default/secrets/.notion}"

if [ -f "$SECRET_FILE" ]; then
  # shellcheck disable=SC1090
  . "$SECRET_FILE"
fi

if [ -z "${NOTION_API_TOKEN:-}" ] && [ -n "${NOTION_API_KEY:-}" ]; then
  export NOTION_API_TOKEN="$NOTION_API_KEY"
fi

export NOTION_KEYRING="${NOTION_KEYRING:-0}"
exec /usr/local/bin/ntn "$@"
