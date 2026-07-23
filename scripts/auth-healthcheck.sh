#!/usr/bin/env bash
# Auth healthcheck / keepalive for the razorclip agent runtime.
#
# Docker mode checks (inside the razorclip-server-1 container):
#   1. Container is running.
#   2. Claude credentials file exists, is non-empty, and is readable by the
#      node user (uid 1000) -- proves bind mount + perms still work after any
#      host-side rotation.
#   3. Claude config file exists and is readable.
#   4. Codex auth file exists, is non-empty, and is readable.
#
# Local mode checks:
#   1. `claude auth status` reports a logged-in claude.ai subscription session.
#   2. ANTHROPIC_API_KEY is not set for the keepalive probe.
#   3. A tiny `claude --print` probe succeeds under the official Claude CLI.
#
# Why not bypass token expiry:
#   We do not read, copy, refresh, or persist raw Claude OAuth tokens here. The
#   probe goes through the supported Claude CLI, which is the only component
#   allowed to maintain its own session. If Claude requires an interactive
#   browser login, this script alerts instead of trying to evade that.
#
# Why not `claude whoami` / `codex whoami`:
#   - The claude CLI does not have a `whoami` subcommand. Passing "whoami"
#     gets treated as a chat prompt and the model hallucinates a reply, which
#     looks like success but proves nothing about auth.
#   - The codex CLI's whoami needs an interactive TTY (`docker exec -it`),
#     which is awkward from launchd. Its auth file existing tells us the
#     same thing without the TTY dance.
#   - File-existence checks catch mount/perms failures; the local Claude probe
#     catches token expiry and auth-required states.
#
# On failure, posts a Telegram alert via the Telegram Bot API directly.
# Hermes uses long polling, not a webhook -- there is no local HTTP send
# endpoint. We use the bot token from ~/.hermes/.env and Chuka's user ID
# (1870056157) as the chat target. See 03-Infrastructure/Hermes-Telegram-Bot.md.
#
# Logs every run to ~/agent/auth-healthcheck.log. Scheduled by
# ~/Library/LaunchAgents/com.agent.auth-healthcheck.plist.

set -uo pipefail

CONTAINER="${RAZORCLIP_CONTAINER:-razorclip-server-1}"
LOG_FILE="${HOME}/agent/auth-healthcheck.log"
HERMES_ENV_FILE="${HERMES_ENV_FILE:-${HOME}/.hermes/.env}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-1870056157}"  # Chuka, per Hermes-Telegram-Bot.md
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"
CLAUDE_BIN="${CLAUDE_BIN:-${HOME}/.local/bin/claude}"
AUTH_HEALTHCHECK_MODE="${AUTH_HEALTHCHECK_MODE:-auto}" # auto | local | docker
CLAUDE_KEEPALIVE_PROBE="${CLAUDE_KEEPALIVE_PROBE:-1}"
CLAUDE_PROBE_MODEL="${CLAUDE_PROBE_MODEL:-claude-sonnet-4-6}"
CLAUDE_PROBE_TIMEOUT_SEC="${CLAUDE_PROBE_TIMEOUT_SEC:-90}"
LOCK_DIR="${TMPDIR:-/tmp}/razorclip-auth-healthcheck.lock"

mkdir -p "$(dirname "$LOG_FILE")"
log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"; }

if ! mkdir "$LOCK_DIR" 2>/dev/null; then
  log "skip: another auth healthcheck is still running"
  exit 0
fi
trap 'rmdir "$LOCK_DIR" 2>/dev/null || true' EXIT

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

docker_container_running() {
  [[ -x "$DOCKER_BIN" ]] && "$DOCKER_BIN" inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true
}

container_check() {
  local description="$1"; shift
  if "$DOCKER_BIN" exec "$CONTAINER" sh -c "$*" >/dev/null 2>&1; then
    log "ok: $description"
    return 0
  fi
  alert "$description failed"
  return 1
}

run_docker_checks() {
  if ! docker_container_running; then
    alert "container $CONTAINER is not running"
    return 1
  fi

  # `test -s` = exists and non-empty. `test -r` = readable. We invoke `test`
  # inside the container so it runs as the node user (uid 1000), which is the
  # same user the agent processes run as -- so this matches what they see.
  local failed=0
  container_check "claude credentials.json present and non-empty (/paperclip/.claude/.credentials.json)" \
    'test -s /paperclip/.claude/.credentials.json && test -r /paperclip/.claude/.credentials.json' || failed=1
  container_check "claude config.json present and readable (/paperclip/.claude/.claude.json)" \
    'test -r /paperclip/.claude/.claude.json' || failed=1
  container_check "codex auth.json present and non-empty (/paperclip/.codex/auth.json)" \
    'test -s /paperclip/.codex/auth.json && test -r /paperclip/.codex/auth.json' || failed=1
  return "$failed"
}

without_anthropic_env() {
  env \
    -u ANTHROPIC_API_KEY \
    -u ANTHROPIC_AUTH_TOKEN \
    -u ANTHROPIC_BEDROCK_BASE_URL \
    -u CLAUDE_CODE_USE_BEDROCK \
    "$@"
}

run_with_timeout() {
  local timeout_sec="$1"; shift
  local out_file="$1"; shift
  local err_file="$1"; shift
  "$@" >"$out_file" 2>"$err_file" &
  local pid=$!
  local elapsed=0
  while kill -0 "$pid" 2>/dev/null; do
    if [[ "$elapsed" -ge "$timeout_sec" ]]; then
      kill -TERM "$pid" 2>/dev/null || true
      sleep 2
      kill -KILL "$pid" 2>/dev/null || true
      wait "$pid" 2>/dev/null || true
      return 124
    fi
    sleep 1
    elapsed=$((elapsed + 1))
  done
  wait "$pid"
}

run_claude_status_check() {
  if [[ ! -x "$CLAUDE_BIN" ]]; then
    alert "Claude CLI is not executable at $CLAUDE_BIN"
    return 1
  fi

  local status_json
  if ! status_json=$(without_anthropic_env "$CLAUDE_BIN" auth status 2>/dev/null); then
    alert "Claude auth status failed. Run: claude auth login --claudeai --sso --email chuka@symphony.to"
    return 1
  fi

  if ! printf '%s' "$status_json" | grep -q '"loggedIn"[[:space:]]*:[[:space:]]*true'; then
    alert "Claude is not logged in. Run: claude auth login --claudeai --sso --email chuka@symphony.to"
    return 1
  fi

  if ! printf '%s' "$status_json" | grep -q '"authMethod"[[:space:]]*:[[:space:]]*"claude.ai"'; then
    alert "Claude is not using claude.ai subscription auth. Check ANTHROPIC_API_KEY and run Claude login again."
    return 1
  fi

  log "ok: Claude auth status is logged in via claude.ai"
}

run_claude_probe() {
  [[ "$CLAUDE_KEEPALIVE_PROBE" == "1" || "$CLAUDE_KEEPALIVE_PROBE" == "true" ]] || {
    log "skip: Claude keepalive probe disabled"
    return 0
  }

  local tmp_base="${TMPDIR:-/tmp}/razorclip-claude-probe.$$"
  local out_file="${tmp_base}.out"
  local err_file="${tmp_base}.err"
  local input_file="${tmp_base}.in"
  printf 'Respond exactly: ok\n' > "$input_file"

  run_with_timeout "$CLAUDE_PROBE_TIMEOUT_SEC" "$out_file" "$err_file" \
    without_anthropic_env "$CLAUDE_BIN" \
      --print - \
      --output-format stream-json \
      --verbose \
      --dangerously-skip-permissions \
      --setting-sources '' \
      --model "$CLAUDE_PROBE_MODEL" \
      --max-turns 1 < "$input_file"
  local status=$?
  local output
  output="$(cat "$out_file" "$err_file" 2>/dev/null || true)"
  rm -f "$out_file" "$err_file" "$input_file"

  if [[ "$status" -eq 124 ]]; then
    alert "Claude keepalive probe timed out after ${CLAUDE_PROBE_TIMEOUT_SEC}s"
    return 1
  fi
  if [[ "$status" -ne 0 ]]; then
    if printf '%s' "$output" | grep -Eqi 'not logged in|please log in|login required|unauthorized|authentication required|invalid authentication'; then
      alert "Claude keepalive probe requires login. Run: claude auth login --claudeai --sso --email chuka@symphony.to"
    else
      alert "Claude keepalive probe failed with exit $status"
    fi
    return 1
  fi

  log "ok: Claude keepalive probe succeeded"
  return 0
}

run_local_checks() {
  local failed=0
  if [[ -n "${ANTHROPIC_API_KEY:-}" ]]; then
    alert "ANTHROPIC_API_KEY is set in the healthcheck environment; subscription auth would be bypassed"
    failed=1
  fi
  run_claude_status_check || failed=1
  run_claude_probe || failed=1
  return "$failed"
}

mode="$AUTH_HEALTHCHECK_MODE"
if [[ "$mode" == "auto" ]]; then
  if docker_container_running; then
    mode="docker"
  else
    mode="local"
  fi
fi

case "$mode" in
  docker) run_docker_checks; failed=$? ;;
  local) run_local_checks; failed=$? ;;
  *)
    alert "invalid AUTH_HEALTHCHECK_MODE=$AUTH_HEALTHCHECK_MODE"
    exit 1
    ;;
esac

if [[ $failed -eq 0 ]]; then
  log "all checks passed ($mode mode)"
fi

exit "$failed"
