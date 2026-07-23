#!/usr/bin/env bash

set -u

STATE_DIR="${PAPERCLIP_STATE_DIR:-${HOME}/agent/paperclip-watchdog}"
CONTAINER_NAME="${PAPERCLIP_CONTAINER_NAME:-razorclip-server-1}"
COMPOSE_FILE="${PAPERCLIP_COMPOSE_FILE:-/Users/agent0/Dev/razorclip/docker/docker-compose.yml}"
LOCAL_HEALTH_URL="${PAPERCLIP_LOCAL_HEALTH_URL:-http://127.0.0.1:3100/api/health}"
PUBLIC_HEALTH_URL="${PAPERCLIP_PUBLIC_HEALTH_URL:-https://office.integral.sh/api/health}"
CLOUDFLARE_LABEL="${PAPERCLIP_CLOUDFLARE_LABEL:-com.cloudflare.cloudflared}"
HERMES_ENV_FILE="${HERMES_ENV_FILE:-${HOME}/.hermes/.env}"
TELEGRAM_CHAT_ID="${TELEGRAM_CHAT_ID:-1870056157}"
HERMES_DASHBOARD_LABELS="${PAPERCLIP_HERMES_DASHBOARD_LABELS:-ai.hermes.desktop,ai.hermes.dashboard}"
HERMES_DASHBOARD_EXECUTABLES="${PAPERCLIP_HERMES_DASHBOARD_EXECUTABLES:-}"
DOCKER_BIN="${DOCKER_BIN:-/usr/local/bin/docker}"
CURL_BIN="${CURL_BIN:-/usr/bin/curl}"
LAUNCHCTL_BIN="${LAUNCHCTL_BIN:-/bin/launchctl}"
SYSCTL_BIN="${SYSCTL_BIN:-/usr/sbin/sysctl}"
NETSTAT_BIN="${NETSTAT_BIN:-/usr/sbin/netstat}"
LSOF_BIN="${LSOF_BIN:-/usr/sbin/lsof}"

SOCKET_WARNING_PERCENT="${PAPERCLIP_SOCKET_WARNING_PERCENT:-70}"
SOCKET_ACTION_PERCENT="${PAPERCLIP_SOCKET_ACTION_PERCENT:-85}"
FAILURES_REQUIRED="${PAPERCLIP_FAILURES_REQUIRED:-2}"
COMPOSE_COOLDOWN_SEC="${PAPERCLIP_COMPOSE_COOLDOWN_SEC:-300}"
DOCKER_COOLDOWN_SEC="${PAPERCLIP_DOCKER_COOLDOWN_SEC:-900}"
CLOUDFLARE_COOLDOWN_SEC="${PAPERCLIP_CLOUDFLARE_COOLDOWN_SEC:-300}"
REBOOT_COOLDOWN_SEC="${PAPERCLIP_REBOOT_COOLDOWN_SEC:-21600}"

DRY_RUN=0
LOCK_HELD=0
NOW=0
SOCKET_PERCENT=0
DOCKER_ENGINE_RESULT=down
CONTAINER_RESULT=down
HOST_RESULT=down
PUBLIC_RESULT=down
CLOUDFLARE_RESULT=down
CLASSIFICATION=unknown

socket_failures=0
docker_failures=0
container_failures=0
host_failures=0
public_failures=0
cloudflare_failures=0
local_recovery_cycles=0
last_compose_at=0
last_docker_at=0
last_cloudflare_at=0
last_reboot_at=0
last_alert_at=0
last_classification=unknown

usage() {
  cat <<'EOF'
Usage: paperclip-watchdog.sh [--dry-run] [--state-dir PATH] [--help]
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=1
        shift
        ;;
      --state-dir)
        [[ $# -ge 2 ]] || return 64
        STATE_DIR="$2"
        shift 2
        ;;
      --help)
        usage
        exit 0
        ;;
      *)
        usage >&2
        return 64
        ;;
    esac
  done
}

timestamp() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    printf '%s' "$NOW"
  else
    date '+%Y-%m-%dT%H:%M:%S%z'
  fi
}

log_line() {
  printf '[%s] %s\n' "$(timestamp)" "$*" >> "$STATE_DIR/watchdog.log"
}

cleanup() {
  if [[ "$LOCK_HELD" -eq 1 ]]; then
    rmdir "$STATE_DIR/watchdog.lock" >/dev/null 2>&1 || true
  fi
}

acquire_lock() {
  if mkdir "$STATE_DIR/watchdog.lock" 2>/dev/null; then
    LOCK_HELD=1
    return 0
  fi
  return 1
}

valid_uint() {
  [[ "$1" =~ ^[0-9]+$ ]]
}

assign_state_value() {
  local key="$1"
  local value="$2"
  case "$key" in
    socket_failures|docker_failures|container_failures|host_failures|public_failures|cloudflare_failures|local_recovery_cycles|last_compose_at|last_docker_at|last_cloudflare_at|last_reboot_at|last_alert_at)
      valid_uint "$value" || return 1
      printf -v "$key" '%s' "$value"
      ;;
    last_classification)
      case "$value" in
        unknown|healthy|socket_pressure|docker_engine_down|container_down|docker_forwarding_broken|cloudflare_path_broken|compound_local_outage)
          last_classification="$value"
          ;;
        *)
          return 1
          ;;
      esac
      ;;
    version)
      [[ "$value" == "1" ]] || return 1
      ;;
    *)
      return 1
      ;;
  esac
}

load_state() {
  local file="$STATE_DIR/state"
  local key value
  [[ -f "$file" ]] || return 0
  while IFS='=' read -r key value; do
    [[ -n "$key" && -n "$value" ]] || return 1
    assign_state_value "$key" "$value" || return 1
  done < "$file"
}

save_state() {
  local tmp="$STATE_DIR/.state.$$"
  (
    umask 077
    cat > "$tmp" <<EOF
version=1
socket_failures=$socket_failures
docker_failures=$docker_failures
container_failures=$container_failures
host_failures=$host_failures
public_failures=$public_failures
cloudflare_failures=$cloudflare_failures
local_recovery_cycles=$local_recovery_cycles
last_compose_at=$last_compose_at
last_docker_at=$last_docker_at
last_cloudflare_at=$last_cloudflare_at
last_reboot_at=$last_reboot_at
last_alert_at=$last_alert_at
last_classification=$last_classification
EOF
    chmod 600 "$tmp"
  ) || return 1
  mv "$tmp" "$STATE_DIR/state"
}

sysctl_value() {
  "$SYSCTL_BIN" -n "$1" 2>/dev/null
}

probe_socket_capacity() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    SOCKET_PERCENT="${PAPERCLIP_TEST_SOCKET_PERCENT:-0}"
    valid_uint "$SOCKET_PERCENT" || return 1
    return 0
  fi

  local first last hifirst hilast low high capacity used
  first="$(sysctl_value net.inet.ip.portrange.first)" || return 1
  last="$(sysctl_value net.inet.ip.portrange.last)" || return 1
  hifirst="$(sysctl_value net.inet.ip.portrange.hifirst)" || return 1
  hilast="$(sysctl_value net.inet.ip.portrange.hilast)" || return 1
  low="$first"
  [[ "$hifirst" -lt "$low" ]] && low="$hifirst"
  high="$last"
  [[ "$hilast" -gt "$high" ]] && high="$hilast"
  capacity=$((high - low + 1))
  [[ "$capacity" -gt 0 ]] || return 1
  used="$("$NETSTAT_BIN" -an -p tcp 2>/dev/null | awk -v low="$low" -v high="$high" '
    $1 ~ /^tcp/ && $NF ~ /^(ESTABLISHED|SYN_SENT|FIN_WAIT_1|FIN_WAIT_2|CLOSE_WAIT|LAST_ACK|TIME_WAIT)$/ {
      endpoint=$4
      sub(/^.*[.:]/, "", endpoint)
      if (endpoint + 0 >= low && endpoint + 0 <= high) seen[$0]=1
    }
    END { print length(seen) }
  ')" || return 1
  SOCKET_PERCENT=$((used * 100 / capacity))
}

probe_docker_engine() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    DOCKER_ENGINE_RESULT="${PAPERCLIP_TEST_DOCKER_ENGINE:-down}"
    return
  fi
  if "$DOCKER_BIN" info >/dev/null 2>&1; then
    DOCKER_ENGINE_RESULT=ok
  else
    DOCKER_ENGINE_RESULT=down
  fi
}

probe_container() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    CONTAINER_RESULT="${PAPERCLIP_TEST_CONTAINER:-down}"
    return
  fi
  if [[ "$DOCKER_ENGINE_RESULT" != "ok" ]]; then
    CONTAINER_RESULT=down
    return
  fi
  if "$DOCKER_BIN" inspect -f '{{.State.Running}}' "$CONTAINER_NAME" 2>/dev/null | grep -q '^true$' \
    && "$DOCKER_BIN" exec "$CONTAINER_NAME" node -e \
      'fetch("http://127.0.0.1:3100/api/health").then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))' \
      >/dev/null 2>&1; then
    CONTAINER_RESULT=ok
  else
    CONTAINER_RESULT=down
  fi
}

http_probe() {
  "$CURL_BIN" -fsS --connect-timeout 3 --max-time 5 --max-redirs 0 "$1" >/dev/null 2>&1
}

probe_host_health() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    HOST_RESULT="${PAPERCLIP_TEST_HOST:-down}"
  elif http_probe "$LOCAL_HEALTH_URL"; then
    HOST_RESULT=ok
  else
    HOST_RESULT=down
  fi
}

probe_public_health() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    PUBLIC_RESULT="${PAPERCLIP_TEST_PUBLIC:-down}"
  elif http_probe "$PUBLIC_HEALTH_URL"; then
    PUBLIC_RESULT=ok
  else
    PUBLIC_RESULT=down
  fi
}

probe_cloudflare() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    CLOUDFLARE_RESULT="${PAPERCLIP_TEST_CLOUDFLARE:-down}"
  elif "$LAUNCHCTL_BIN" print "system/$CLOUDFLARE_LABEL" >/dev/null 2>&1; then
    CLOUDFLARE_RESULT=ok
  else
    CLOUDFLARE_RESULT=down
  fi
}

run_probes() {
  probe_socket_capacity || SOCKET_PERCENT=100
  probe_docker_engine
  probe_container
  probe_host_health
  probe_public_health
  probe_cloudflare
}

classify_failure() {
  if [[ "$SOCKET_PERCENT" -ge "$SOCKET_ACTION_PERCENT" ]]; then
    CLASSIFICATION=socket_pressure
  elif [[ "$DOCKER_ENGINE_RESULT" != "ok" ]]; then
    CLASSIFICATION=docker_engine_down
  elif [[ "$CONTAINER_RESULT" != "ok" ]]; then
    CLASSIFICATION=container_down
  elif [[ "$HOST_RESULT" != "ok" ]]; then
    CLASSIFICATION=docker_forwarding_broken
  elif [[ "$PUBLIC_RESULT" != "ok" ]]; then
    CLASSIFICATION=cloudflare_path_broken
  else
    CLASSIFICATION=healthy
  fi
}

reset_failure_counters() {
  socket_failures=0
  docker_failures=0
  container_failures=0
  host_failures=0
  public_failures=0
  cloudflare_failures=0
}

increment_failure_counters() {
  local previous=0
  case "$CLASSIFICATION" in
    healthy)
      reset_failure_counters
      local_recovery_cycles=0
      ;;
    socket_pressure)
      previous="$socket_failures"
      reset_failure_counters
      socket_failures=$((previous + 1))
      ;;
    docker_engine_down)
      previous="$docker_failures"
      reset_failure_counters
      docker_failures=$((previous + 1))
      ;;
    container_down)
      previous="$container_failures"
      reset_failure_counters
      container_failures=$((previous + 1))
      ;;
    docker_forwarding_broken)
      previous="$host_failures"
      reset_failure_counters
      host_failures=$((previous + 1))
      ;;
    cloudflare_path_broken)
      previous="$public_failures"
      reset_failure_counters
      public_failures=$((previous + 1))
      cloudflare_failures=$((cloudflare_failures + 1))
      ;;
  esac
}

action_command() {
  local action="$1"
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    printf '%s\n' "$action" >> "${PAPERCLIP_TEST_COMMAND_LOG:?test command log required}"
    return 0
  fi
  case "$action" in
    compose-up)
      "$DOCKER_BIN" compose -f "$COMPOSE_FILE" up -d
      ;;
    restart-docker)
      /usr/bin/osascript -e 'tell application "Docker" to quit' >/dev/null 2>&1 || true
      /usr/bin/open -a Docker
      ;;
    restart-cloudflare)
      "$LAUNCHCTL_BIN" kickstart -k "system/$CLOUDFLARE_LABEL"
      ;;
    stop-hermes-dashboard)
      stop_hermes_dashboard
      ;;
    reboot-host)
      /sbin/shutdown -r now
      ;;
    *)
      return 64
      ;;
  esac
}

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

send_alert() {
  local severity="$1"
  local alert_class="$2"
  local message="$3"
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    printf 'alert:%s:%s\n' "$severity" "$alert_class" >> "${PAPERCLIP_TEST_COMMAND_LOG:?test command log required}"
    return 0
  fi
  local token
  token="$(resolve_telegram_token || true)"
  if [[ -z "$token" ]]; then
    log_line "alert_delivery=skipped class=$alert_class reason=missing_token"
    return 0
  fi
  "$CURL_BIN" -fsS --connect-timeout 3 --max-time 10 \
    -d "chat_id=$TELEGRAM_CHAT_ID" \
    --data-urlencode "text=[paperclip watchdog][$severity] $message" \
    "https://api.telegram.org/bot${token}/sendMessage" >/dev/null 2>&1 || {
      log_line "alert_delivery=failed class=$alert_class"
      return 0
    }
}

list_csv() {
  printf '%s' "$1" | tr ',' '\n'
}

is_allowlisted_label() {
  local candidate="$1"
  local allowed
  while IFS= read -r allowed; do
    [[ -n "$allowed" && "$candidate" == "$allowed" ]] && return 0
  done <<EOF
$(list_csv "$HERMES_DASHBOARD_LABELS")
EOF
  return 1
}

is_allowlisted_executable() {
  local candidate="$1"
  local remaining="$HERMES_DASHBOARD_EXECUTABLES"
  local allowed
  while [[ -n "$remaining" ]]; do
    allowed="${remaining%%:*}"
    if [[ "$remaining" == *:* ]]; then
      remaining="${remaining#*:}"
    else
      remaining=""
    fi
    [[ -n "$allowed" && "$candidate" == "$allowed" ]] && return 0
  done
  return 1
}

identify_hermes_dashboard_owner() {
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    [[ "${PAPERCLIP_TEST_HERMES_OWNER:-none}" == "allowlisted" ]]
    return
  fi

  local pids pid executable label label_pid
  pids="$("$LSOF_BIN" -nP -t -iTCP@127.0.0.1:9120 2>/dev/null | sort -u)"
  [[ -n "$pids" ]] || return 1
  for pid in $pids; do
    executable="$(/bin/ps -p "$pid" -o comm= 2>/dev/null | sed 's/^[[:space:]]*//')"
    if is_allowlisted_executable "$executable"; then
      printf 'pid:%s' "$pid"
      return 0
    fi
    while IFS= read -r label; do
      [[ -n "$label" ]] || continue
      label_pid="$("$LAUNCHCTL_BIN" print "gui/$(id -u)/$label" 2>/dev/null | awk '/^[[:space:]]*pid = / { print $3; exit }')"
      if [[ "$label_pid" == "$pid" ]] && is_allowlisted_label "$label"; then
        printf 'label:%s' "$label"
        return 0
      fi
    done <<EOF
$(list_csv "$HERMES_DASHBOARD_LABELS")
EOF
  done
  return 1
}

stop_hermes_dashboard() {
  local owner
  if [[ "${PAPERCLIP_TEST_MODE:-0}" == "1" ]]; then
    [[ "${PAPERCLIP_TEST_HERMES_OWNER:-none}" == "allowlisted" ]]
    return
  fi
  owner="$(identify_hermes_dashboard_owner)" || return 1
  case "$owner" in
    label:*)
      "$LAUNCHCTL_BIN" kill SIGTERM "gui/$(id -u)/${owner#label:}"
      ;;
    pid:*)
      /bin/kill -TERM "${owner#pid:}"
      ;;
    *)
      return 1
      ;;
  esac
}

perform_action() {
  local action="$1"
  if [[ "$DRY_RUN" -eq 1 ]]; then
    log_line "dry_run action=$action"
    return 0
  fi
  log_line "action=$action"
  action_command "$action"
}

choose_recovery_action() {
  case "$CLASSIFICATION" in
    socket_pressure)
      if [[ "$socket_failures" -ge "$FAILURES_REQUIRED" ]]; then
        if identify_hermes_dashboard_owner >/dev/null; then
          printf '%s' stop-hermes-dashboard
        else
          send_alert critical socket_owner_unverified \
            "Socket use is ${SOCKET_PERCENT}% but the port 9120 owner is not allowlisted; no process was stopped."
          log_line "action=suppressed reason=socket_owner_unverified"
        fi
      fi
      ;;
    container_down)
      [[ "$container_failures" -ge "$FAILURES_REQUIRED" ]] && printf '%s' compose-up
      ;;
  esac
}

main() {
  parse_args "$@" || return $?
  umask 077
  mkdir -p "$STATE_DIR" || return 73
  chmod 700 "$STATE_DIR" 2>/dev/null || true
  NOW="${PAPERCLIP_TEST_NOW:-$(date +%s)}"
  valid_uint "$NOW" || return 64
  acquire_lock || return 0
  trap cleanup EXIT INT TERM
  if ! load_state; then
    log_line "invalid_state action=suppressed"
    return 65
  fi

  run_probes
  classify_failure
  increment_failure_counters
  log_line "classification=$CLASSIFICATION socket_percent=$SOCKET_PERCENT docker=$DOCKER_ENGINE_RESULT container=$CONTAINER_RESULT host=$HOST_RESULT public=$PUBLIC_RESULT cloudflare=$CLOUDFLARE_RESULT"

  if [[ "$SOCKET_PERCENT" -ge "$SOCKET_WARNING_PERCENT" && "$SOCKET_PERCENT" -lt "$SOCKET_ACTION_PERCENT" ]]; then
    send_alert warning socket_pressure "Ephemeral TCP socket use reached ${SOCKET_PERCENT}%."
  fi

  local action
  action="$(choose_recovery_action)"
  if [[ -n "$action" ]]; then
    perform_action "$action" || log_line "action_failed=$action"
    if [[ "$DRY_RUN" -eq 0 ]]; then
      case "$action" in
        compose-up)
          last_compose_at="$NOW"
          local_recovery_cycles=$((local_recovery_cycles + 1))
          ;;
      esac
    fi
  fi

  last_classification="$CLASSIFICATION"
  save_state || return 74
  return 0
}

main "$@"
