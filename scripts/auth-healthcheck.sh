#!/usr/bin/env bash
# Daily auth healthcheck for the razorclip agent runtime.
#
# What it checks:
#   - claude CLI inside the razorclip-server-1 container reports a logged-in user
#   - codex CLI inside the same container reports a logged-in user
#
# Why these checks (and not host `claude whoami`):
#   The agents run inside the container. Host login is necessary but not
#   sufficient -- the bind mount + perms have to be working too. Checking
#   inside the container is the only honest signal of "would Bob be able to
#   make a request right now."
#
# On failure, posts a Telegram alert via the hermes gateway. On success, exits
# silently (cron-friendly). Logs every run to ~/agent/auth-healthcheck.log so
# there's a paper trail when something does break.
#
# Scheduled by ~/Library/LaunchAgents/com.agent.auth-healthcheck.plist (8am daily).

set -uo pipefail

CONTAINER="${RAZORCLIP_CONTAINER:-razorclip-server-1}"
LOG_FILE="${HOME}/agent/auth-healthcheck.log"
HERMES_TG_URL="${HERMES_TG_URL:-http://localhost:8765/telegram/send}"
HERMES_TG_CHAT_ID="${HERMES_TG_CHAT_ID:-}"   # set in the launchd plist if you want explicit routing
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"

mkdir -p "$(dirname "$LOG_FILE")"

log() { printf '[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*" >> "$LOG_FILE"; }

alert() {
  local msg="$1"
  log "ALERT: $msg"
  # Best-effort hermes telegram post. If hermes is down we still have the log.
  local payload
  if [[ -n "$HERMES_TG_CHAT_ID" ]]; then
    payload=$(printf '{"chat_id":"%s","text":"[razorclip auth healthcheck] %s"}' "$HERMES_TG_CHAT_ID" "$msg")
  else
    payload=$(printf '{"text":"[razorclip auth healthcheck] %s"}' "$msg")
  fi
  curl -fsS -m 10 -X POST -H "Content-Type: application/json" -d "$payload" "$HERMES_TG_URL" >/dev/null 2>&1 \
    || log "warn: failed to deliver telegram alert via $HERMES_TG_URL"
}

check_cli() {
  local label="$1"; shift
  local out rc
  # All CLIs we check are non-interactive on whoami; codex needs -t for some
  # versions but `docker exec` without -it is fine for the auth lookup path.
  out=$("$DOCKER_BIN" exec "$CONTAINER" "$@" 2>&1)
  rc=$?
  if [[ $rc -ne 0 ]]; then
    alert "$label whoami exited $rc: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-300)"
    return 1
  fi
  if printf '%s' "$out" | grep -qiE 'not logged in|please run /login|unauthorized|forbidden'; then
    alert "$label whoami says not logged in: $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-300)"
    return 1
  fi
  log "ok: $label whoami -> $(printf '%s' "$out" | tr '\n' ' ' | cut -c1-200)"
  return 0
}

# Container has to be up at all.
if ! "$DOCKER_BIN" inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  alert "container $CONTAINER is not running"
  exit 1
fi

failed=0
check_cli "claude" claude whoami || failed=1
check_cli "codex"  codex whoami  || failed=1

exit "$failed"
