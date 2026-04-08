#!/usr/bin/env bash
# Daily auth healthcheck for the razorclip agent runtime.
#
# What it checks (inside the razorclip-server-1 container):
#   1. Container is running.
#   2. Claude credentials file exists, is non-empty, and is readable by the
#      node user (uid 1000) -- proves bind mount + perms still work after any
#      host-side rotation.
#   3. Claude config file exists and is readable.
#   4. Codex auth file exists, is non-empty, and is readable.
#
# Why not `claude whoami` / `codex whoami`:
#   - The claude CLI does not have a `whoami` subcommand. Passing "whoami"
#     gets treated as a chat prompt and the model hallucinates a reply, which
#     looks like success but proves nothing about auth.
#   - The codex CLI's whoami needs an interactive TTY (`docker exec -it`),
#     which is awkward from launchd. Its auth file existing tells us the
#     same thing without the TTY dance.
#   - File-existence checks catch every failure mode we have actually hit
#     (missing .claude.json, perms blocking the node user, the mount missing
#     entirely). They do NOT catch token expiry -- if you want that, layer
#     a real API call on top later.
#
# On failure, posts a Telegram alert via the Telegram Bot API directly.
# Hermes uses long polling, not a webhook -- there is no local HTTP send
# endpoint. We use the bot token from ~/.hermes/.env and Chuka's user ID
# (1870056157) as the chat target. See 03-Infrastructure/Hermes-Telegram-Bot.md.
#
# Logs every run to ~/agent/auth-healthcheck.log. Scheduled by
# ~/Library/LaunchAgents/com.agent.auth-healthcheck.plist (08:00 daily).

set -uo pipefail

CONTAINER="${RAZORCLIP_CONTAINER:-razorclip-server-1}"
LOG_FILE="${HOME}/agent/auth-healthcheck.log"
HERMES_ENV_FILE="${HERMES_ENV_FILE:-${HOME}/.hermes/.env}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-1870056157}"  # Chuka, per Hermes-Telegram-Bot.md
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"

mkdir -p "$(dirname "$LOG_FILE")"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"; }

resolve_telegram_token() {
  if [[ -n "${TELEGRAM_BOT_TOKEN:-}" ]]; then
    printf '%s' "$TELEGRAM_BOT_TOKEN"
    return 0
  fi
  if [[ -r "$HERMES_ENV_FILE" ]]; then
    awk -F= '/^TELEGRAM_BOT_TOKEN=/{
      sub(/^TELEGRAM_BOT_TOKEN=/, "");
      gsub(/^["'\'']|["'\'']$/, "");
      print; exit
    }' "$HERMES_ENV_FILE"
    return 0
  fi
  return 1
}

alert() {
  local msg="$1"
  log "ALERT: $msg"
  local token
  token=$(resolve_telegram_token || true)
  if [[ -z "$token" ]]; then
    log "warn: no TELEGRAM_BOT_TOKEN available (env or $HERMES_ENV_FILE), skipping telegram"
    return
  fi
  local text="[razorclip auth healthcheck] $msg"
  curl -fsS -m 10 \
    -d "chat_id=${TELEGRAM_CHAT_ID}" \
    --data-urlencode "text=${text}" \
    "https://api.telegram.org/bot${token}/sendMessage" >/dev/null 2>&1 \
    || log "warn: failed to deliver telegram alert via api.telegram.org"
}

# Step 1: container has to be up.
if ! "$DOCKER_BIN" inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  alert "container $CONTAINER is not running"
  exit 1
fi

# Step 2-4: in-container file checks.
# `test -s` = exists and non-empty. `test -r` = readable. We invoke `test`
# inside the container so it runs as the node user (uid 1000), which is the
# same user the agent processes run as -- so this matches what they see.
container_check() {
  local description="$1"; shift
  if "$DOCKER_BIN" exec "$CONTAINER" sh -c "$*" >/dev/null 2>&1; then
    log "ok: $description"
    return 0
  fi
  alert "$description failed"
  return 1
}

failed=0
container_check "claude credentials.json present and non-empty (/paperclip/.claude/.credentials.json)" \
  'test -s /paperclip/.claude/.credentials.json && test -r /paperclip/.claude/.credentials.json' || failed=1
container_check "claude config.json present and readable (/paperclip/.claude/.claude.json)" \
  'test -r /paperclip/.claude/.claude.json' || failed=1
container_check "codex auth.json present and non-empty (/paperclip/.codex/auth.json)" \
  'test -s /paperclip/.codex/auth.json && test -r /paperclip/.codex/auth.json' || failed=1

if [[ $failed -eq 0 ]]; then
  log "all checks passed"
fi

exit "$failed"
