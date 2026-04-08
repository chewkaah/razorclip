#!/usr/bin/env bash
# Migrate Tier 1 dev agents (Bob, Quinn, Chen) from claude_local to codex_local.
#
# Why: Bob/Quinn/Chen are dev agents and Codex is the better-fit subscription
# (gpt-5 line for Bob/Chen, smaller model for Quinn QA). This takes 3 agents
# off the Claude subscription, reducing rate-limit pressure and login-expiry
# blast radius. See 03-Infrastructure/Agent-Runtime.md, "Tier 1: Codex
# Subscription (Dev Agents)" in the obsidian vault.
#
# Approach: writes directly to the paperclip postgres via the db container.
# We don't have a host paperclipai CLI installed and the server is in
# authenticated/private mode behind better-auth -- direct DB write is the
# simplest path that needs no token plumbing. The codex_local adapter only
# needs `{model: "..."}` to function; defaults like `command: "codex"` are
# applied at execute time, so no normalization is being skipped that matters.
#
# Idempotent: re-running just re-applies the same UPDATE.
#
# After running: restart the server container so any in-memory agent config
# cache is dropped:
#   docker compose -f ~/Dev/razorclip/docker-compose.yml restart server

set -euo pipefail

DB_CONTAINER="${RAZORCLIP_DB_CONTAINER:-razorclip-db-1}"
DB_USER="${RAZORCLIP_DB_USER:-paperclip}"
DB_NAME="${RAZORCLIP_DB_NAME:-paperclip}"
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"

if ! "$DOCKER_BIN" inspect -f '{{.State.Running}}' "$DB_CONTAINER" 2>/dev/null | grep -q true; then
  echo "error: db container $DB_CONTAINER is not running" >&2
  exit 1
fi

psql() {
  "$DOCKER_BIN" exec -i "$DB_CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -v ON_ERROR_STOP=1 "$@"
}

# Per-agent target model. Quinn gets a smaller reasoning model for QA;
# Bob and Chen get the strongest dev model. Edit if you want different pins.
# Parallel arrays (bash 3.2 on macOS lacks associative arrays).
AGENT_NAMES=(bob quinn chen)
AGENT_MODELS=("gpt-5" "o4-mini" "gpt-5")

migrate_agent() {
  local name="$1" model="$2"
  local matches
  matches=$(psql -tA -c "SELECT id || '|' || name || '|' || adapter_type FROM agents WHERE LOWER(name) = LOWER('$name');")
  if [[ -z "$matches" ]]; then
    echo "  -- no agent named $name, skipping"
    return
  fi
  local count
  count=$(printf '%s\n' "$matches" | wc -l | tr -d ' ')
  if [[ "$count" -gt 1 ]]; then
    echo "  !! multiple agents named $name, refusing to guess:" >&2
    printf '%s\n' "$matches" >&2
    return
  fi
  local id pretty_name current_adapter
  id=$(printf '%s' "$matches" | awk -F'|' '{print $1}')
  pretty_name=$(printf '%s' "$matches" | awk -F'|' '{print $2}')
  current_adapter=$(printf '%s' "$matches" | awk -F'|' '{print $3}')
  echo "  -> $pretty_name ($id): $current_adapter -> codex_local / $model"
  local config_json="{\"model\":\"$model\"}"
  psql -v "id=$id" -v "cfg=$config_json" <<'SQL' >/dev/null
UPDATE agents
SET adapter_type = 'codex_local',
    adapter_config = :'cfg'::jsonb,
    updated_at = NOW()
WHERE id = :'id'::uuid;
SQL
}

echo "migrating tier 1 dev agents to codex_local..."
i=0
while [ $i -lt ${#AGENT_NAMES[@]} ]; do
  migrate_agent "${AGENT_NAMES[$i]}" "${AGENT_MODELS[$i]}"
  i=$((i + 1))
done

echo
echo "current state of tier 1 agents:"
psql -c "SELECT name, adapter_type, adapter_config FROM agents WHERE LOWER(name) IN ('bob','quinn','chen') ORDER BY name;"

echo
echo "remember to restart the server container so it drops any cached config:"
echo "  docker compose -f ~/Dev/razorclip/docker-compose.yml restart server"
