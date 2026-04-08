#!/usr/bin/env bash
# Migrate Tier 1 dev agents (Bob, Quinn, Chen) from claude_local to codex_local.
#
# Why: Bob/Quinn/Chen are dev agents and Codex is the better-fit subscription
# (gpt-5 line for Bob/Chen, smaller model for Quinn QA). This takes 3 agents
# off the Claude subscription, reducing rate-limit pressure and login-expiry
# blast radius. See 03-Infrastructure/Agent-Runtime.md, "Tier 1: Codex
# Subscription (Dev Agents)" in the obsidian vault.
#
# Prereqs:
#   - Run on the mac mini (the box that hosts paperclip).
#   - paperclip CLI is installed and authenticated (`paperclip agent list` works).
#   - codex login completed inside the server container (see persistence plan
#     fix #3 in the runtime doc).
#   - jq installed.
#
# Idempotent: re-running just re-applies the same PATCH. No-op if already on
# codex_local with the same model.

set -euo pipefail

API_BASE="${PAPERCLIP_API_URL:-http://localhost:3100}"
AUTH_FILE="${PAPERCLIP_HOME:-$HOME/.paperclip}/auth.json"

if ! command -v jq >/dev/null 2>&1; then
  echo "error: jq is required" >&2
  exit 1
fi
if [[ ! -f "$AUTH_FILE" ]]; then
  echo "error: paperclip auth file not found at $AUTH_FILE -- run 'paperclip auth login' first" >&2
  exit 1
fi

# Pull the bearer token for this api base out of the CLI auth store.
TOKEN=$(jq -r --arg base "$API_BASE" '
  .credentials
  | to_entries
  | map(select(.key as $k | ($k | rtrimstr("/")) == ($base | rtrimstr("/"))))
  | .[0].value.token // empty
' "$AUTH_FILE")

if [[ -z "$TOKEN" ]]; then
  echo "error: no stored credential for $API_BASE in $AUTH_FILE" >&2
  echo "       run: paperclip auth login --api-base $API_BASE" >&2
  exit 1
fi

auth_curl() {
  curl -fsS -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" "$@"
}

# Per-agent target adapter config. Quinn gets a smaller reasoning model for QA;
# Bob and Chen get the strongest dev model. Adjust models here if you want to
# pin different ones -- everything else in the script is generic.
declare -A AGENT_MODEL=(
  [bob]="gpt-5"
  [quinn]="o4-mini"
  [chen]="gpt-5"
)

# Discover companies the user has access to. We patch agents in every company
# that contains a name match -- in practice there's only one (Razorclip).
COMPANIES_JSON=$(auth_curl "$API_BASE/api/companies")
COMPANY_IDS=$(echo "$COMPANIES_JSON" | jq -r '(.companies // .) | .[].id')

if [[ -z "$COMPANY_IDS" ]]; then
  echo "error: no companies returned from $API_BASE/api/companies" >&2
  exit 1
fi

migrate_agent() {
  local agent_id="$1" agent_name="$2" model="$3"
  echo "  -> patching $agent_name ($agent_id) to codex_local / $model"
  local payload
  payload=$(jq -nc \
    --arg model "$model" \
    '{adapterType: "codex_local", adapterConfig: {model: $model}, replaceAdapterConfig: false}')
  auth_curl -X PATCH \
    -d "$payload" \
    "$API_BASE/api/agents/$agent_id" >/dev/null
  echo "     ok"
}

for company_id in $COMPANY_IDS; do
  echo "company $company_id:"
  agents_json=$(auth_curl "$API_BASE/api/companies/$company_id/agents")
  for key in "${!AGENT_MODEL[@]}"; do
    model="${AGENT_MODEL[$key]}"
    matches=$(echo "$agents_json" | jq -c --arg n "$key" '
      (.agents // .) | map(select((.name // "") | ascii_downcase == $n))
    ')
    count=$(echo "$matches" | jq 'length')
    if [[ "$count" == "0" ]]; then
      echo "  -- no agent named $key in this company, skipping"
      continue
    fi
    if [[ "$count" -gt 1 ]]; then
      echo "  !! multiple agents named $key in this company, refusing to guess" >&2
      continue
    fi
    agent_id=$(echo "$matches" | jq -r '.[0].id')
    current_adapter=$(echo "$matches" | jq -r '.[0].adapterType')
    if [[ "$current_adapter" == "codex_local" ]]; then
      echo "  == $key already on codex_local, re-patching to ensure model=$model"
    fi
    migrate_agent "$agent_id" "$key" "$model"
  done
done

echo
echo "done. verify with: paperclip agent list --json | jq '.[] | {name, adapterType, adapterConfig}'"
