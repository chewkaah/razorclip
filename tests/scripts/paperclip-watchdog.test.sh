#!/usr/bin/env bash

set -u

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WATCHDOG="$ROOT_DIR/scripts/paperclip-watchdog.sh"
TMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/paperclip-watchdog-test.XXXXXX")"
TESTS_RUN=0
TESTS_FAILED=0
LAST_STATUS=0
CASE_DIR=""
COMMAND_LOG=""

cleanup() {
  rm -rf "$TMP_ROOT"
}
trap cleanup EXIT

fail() {
  printf 'not ok - %s\n' "$1" >&2
  TESTS_FAILED=$((TESTS_FAILED + 1))
}

pass() {
  printf 'ok - %s\n' "$1"
}

begin_case() {
  TESTS_RUN=$((TESTS_RUN + 1))
  CASE_DIR="$TMP_ROOT/case-$TESTS_RUN"
  COMMAND_LOG="$CASE_DIR/commands.log"
  mkdir -p "$CASE_DIR/state"
  : > "$COMMAND_LOG"

  export PAPERCLIP_TEST_MODE=1
  export PAPERCLIP_STATE_DIR="$CASE_DIR/state"
  export PAPERCLIP_TEST_COMMAND_LOG="$COMMAND_LOG"
  export PAPERCLIP_TEST_SOCKET_PERCENT=10
  export PAPERCLIP_TEST_DOCKER_ENGINE=ok
  export PAPERCLIP_TEST_CONTAINER=ok
  export PAPERCLIP_TEST_HOST=ok
  export PAPERCLIP_TEST_PUBLIC=ok
  export PAPERCLIP_TEST_CLOUDFLARE=ok
  export PAPERCLIP_TEST_HERMES_OWNER=none
  export PAPERCLIP_TEST_NOW=1000
}

run_watchdog() {
  "$WATCHDOG" --state-dir "$CASE_DIR/state" "$@" >/dev/null 2>&1
  LAST_STATUS=$?
}

assert_status() {
  local expected="$1"
  [[ "$LAST_STATUS" -eq "$expected" ]]
}

assert_log_contains() {
  local expected="$1"
  grep -Fq "$expected" "$CASE_DIR/state/watchdog.log"
}

assert_command_not_called() {
  local command="$1"
  ! grep -Fxq "$command" "$COMMAND_LOG"
}

assert_command_count() {
  local command="$1"
  local expected="$2"
  local actual
  actual="$(grep -Fxc "$command" "$COMMAND_LOG" || true)"
  [[ "$actual" -eq "$expected" ]]
}

assert_state_value() {
  local key="$1"
  local expected="$2"
  grep -Fxq "$key=$expected" "$CASE_DIR/state/state"
}

test_healthy_cycle_takes_no_action() {
  begin_case
  run_watchdog

  if assert_status 0 \
    && assert_log_contains "classification=healthy" \
    && assert_command_not_called "restart-docker" \
    && assert_command_not_called "compose-up" \
    && assert_command_not_called "restart-cloudflare" \
    && assert_command_not_called "reboot-host"; then
    pass "healthy cycle takes no recovery action"
  else
    fail "healthy cycle takes no recovery action"
  fi
}

test_first_container_failure_only_increments_counter() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  run_watchdog

  if assert_status 0 \
    && assert_state_value "container_failures" 1 \
    && assert_command_not_called "compose-up"; then
    pass "first container failure only increments its counter"
  else
    fail "first container failure only increments its counter"
  fi
}

test_second_container_failure_runs_compose() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_command_count "compose-up" 1; then
    pass "second container failure runs Compose recovery"
  else
    fail "second container failure runs Compose recovery"
  fi
}

test_dry_run_records_but_does_not_run_recovery() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog --dry-run

  if assert_status 0 \
    && assert_log_contains "dry_run action=compose-up" \
    && assert_command_not_called "compose-up"; then
    pass "dry-run records recovery without executing it"
  else
    fail "dry-run records recovery without executing it"
  fi
}

test_healthy_cycle_resets_failure_state() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  run_watchdog
  export PAPERCLIP_TEST_CONTAINER=ok
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_state_value "container_failures" 0 \
    && assert_state_value "local_recovery_cycles" 0; then
    pass "healthy cycle resets failure and recovery counters"
  else
    fail "healthy cycle resets failure and recovery counters"
  fi
}

test_socket_below_warning_is_quiet() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=69
  run_watchdog

  if assert_status 0 \
    && assert_command_not_called "alert:warning:socket_pressure" \
    && assert_command_not_called "stop-hermes-dashboard"; then
    pass "socket use below warning threshold is quiet"
  else
    fail "socket use below warning threshold is quiet"
  fi
}

test_socket_warning_alerts_without_termination() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=70
  run_watchdog

  if assert_status 0 \
    && assert_command_count "alert:warning:socket_pressure" 1 \
    && assert_command_not_called "stop-hermes-dashboard"; then
    pass "socket warning alerts without terminating a process"
  else
    fail "socket warning alerts without terminating a process"
  fi
}

test_first_socket_intervention_cycle_only_counts() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=85
  export PAPERCLIP_TEST_HERMES_OWNER=allowlisted
  run_watchdog

  if assert_status 0 \
    && assert_state_value "socket_failures" 1 \
    && assert_command_not_called "stop-hermes-dashboard"; then
    pass "first socket intervention cycle only increments its counter"
  else
    fail "first socket intervention cycle only increments its counter"
  fi
}

test_second_socket_intervention_stops_allowlisted_owner() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=85
  export PAPERCLIP_TEST_HERMES_OWNER=allowlisted
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_command_count "stop-hermes-dashboard" 1 \
    && assert_command_not_called "reboot-host"; then
    pass "second socket intervention stops only the allowlisted owner"
  else
    fail "second socket intervention stops only the allowlisted owner"
  fi
}

test_unknown_socket_owner_is_not_terminated() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=85
  export PAPERCLIP_TEST_HERMES_OWNER=unknown
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_command_not_called "stop-hermes-dashboard" \
    && assert_command_count "alert:critical:socket_owner_unverified" 1; then
    pass "unknown socket owner is alerted but not terminated"
  else
    fail "unknown socket owner is alerted but not terminated"
  fi
}

test_socket_pressure_alone_never_advances_reboot() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=90
  export PAPERCLIP_TEST_HERMES_OWNER=allowlisted
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_state_value "local_recovery_cycles" 0 \
    && assert_command_not_called "reboot-host"; then
    pass "socket pressure alone never advances reboot escalation"
  else
    fail "socket pressure alone never advances reboot escalation"
  fi
}

test_docker_engine_failure_recovers_docker_and_compose() {
  begin_case
  export PAPERCLIP_TEST_DOCKER_ENGINE=down
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_command_count "restart-docker" 1 \
    && assert_command_count "compose-up" 1; then
    pass "Docker engine failure restarts Docker then restores Compose"
  else
    fail "Docker engine failure restarts Docker then restores Compose"
  fi
}

test_forwarding_failure_recovers_docker_and_compose() {
  begin_case
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_command_count "restart-docker" 1 \
    && assert_command_count "compose-up" 1; then
    pass "host forwarding failure restarts Docker then restores Compose"
  else
    fail "host forwarding failure restarts Docker then restores Compose"
  fi
}

test_public_failure_restarts_cloudflare_only() {
  begin_case
  export PAPERCLIP_TEST_PUBLIC=down
  export PAPERCLIP_TEST_CLOUDFLARE=down
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_command_count "restart-cloudflare" 1 \
    && assert_command_not_called "restart-docker" \
    && assert_command_not_called "compose-up" \
    && assert_state_value "local_recovery_cycles" 0; then
    pass "public-only failure restarts Cloudflare only"
  else
    fail "public-only failure restarts Cloudflare only"
  fi
}

test_persistent_public_failure_never_reboots() {
  begin_case
  export PAPERCLIP_TEST_PUBLIC=down
  export PAPERCLIP_TEST_CLOUDFLARE=down
  local now=1000
  local cycle=0
  while [[ "$cycle" -lt 6 ]]; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
    now=$((now + 360))
    cycle=$((cycle + 1))
  done

  if assert_command_not_called "reboot-host" \
    && assert_state_value "local_recovery_cycles" 0; then
    pass "persistent public-only failure never authorizes reboot"
  else
    fail "persistent public-only failure never authorizes reboot"
  fi
}

test_local_outage_reboots_after_three_failed_recoveries() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  local now
  for now in 1000 1060 1361 1662 1963; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done

  if assert_command_count "compose-up" 3 \
    && assert_command_count "reboot-host" 1; then
    pass "local outage reboots after exactly three failed recoveries"
  else
    fail "local outage reboots after exactly three failed recoveries"
  fi
}

test_local_recovery_before_third_attempt_prevents_reboot() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  local now
  for now in 1000 1060 1361; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done
  export PAPERCLIP_TEST_CONTAINER=ok
  export PAPERCLIP_TEST_HOST=ok
  export PAPERCLIP_TEST_PUBLIC=ok
  export PAPERCLIP_TEST_NOW=1421
  run_watchdog

  if assert_command_not_called "reboot-host" \
    && assert_state_value "local_recovery_cycles" 0; then
    pass "local recovery before the third attempt prevents reboot"
  else
    fail "local recovery before the third attempt prevents reboot"
  fi
}

test_compose_cooldown_suppresses_duplicate_recovery() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  local now
  for now in 1000 1060 1120; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done

  if assert_command_count "compose-up" 1 \
    && assert_log_contains "action=suppressed reason=cooldown action=compose-up"; then
    pass "Compose cooldown suppresses duplicate recovery"
  else
    fail "Compose cooldown suppresses duplicate recovery"
  fi
}

test_docker_cooldown_suppresses_duplicate_recovery() {
  begin_case
  export PAPERCLIP_TEST_DOCKER_ENGINE=down
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  local now
  for now in 1000 1060 1120; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done

  if assert_command_count "restart-docker" 1 \
    && assert_log_contains "action=suppressed reason=cooldown action=docker-recover"; then
    pass "Docker cooldown suppresses duplicate recovery"
  else
    fail "Docker cooldown suppresses duplicate recovery"
  fi
}

test_cloudflare_cooldown_suppresses_duplicate_recovery() {
  begin_case
  export PAPERCLIP_TEST_PUBLIC=down
  export PAPERCLIP_TEST_CLOUDFLARE=down
  local now
  for now in 1000 1060 1120; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done

  if assert_command_count "restart-cloudflare" 1 \
    && assert_log_contains "action=suppressed reason=cooldown action=restart-cloudflare"; then
    pass "Cloudflare cooldown suppresses duplicate recovery"
  else
    fail "Cloudflare cooldown suppresses duplicate recovery"
  fi
}

test_existing_lock_skips_cycle() {
  begin_case
  mkdir "$CASE_DIR/state/watchdog.lock"
  run_watchdog

  if assert_status 0 \
    && [[ ! -s "$COMMAND_LOG" ]]; then
    pass "existing lock skips the watchdog cycle"
  else
    fail "existing lock skips the watchdog cycle"
  fi
}

test_invalid_state_fails_closed() {
  begin_case
  printf 'last_reboot_at=$(reboot-host)\n' > "$CASE_DIR/state/state"
  run_watchdog

  if assert_status 65 \
    && [[ ! -s "$COMMAND_LOG" ]] \
    && assert_log_contains "invalid_state action=suppressed"; then
    pass "invalid state fails closed without a disruptive action"
  else
    fail "invalid state fails closed without a disruptive action"
  fi
}

test_alert_delivery_failure_does_not_block_recovery() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_ALERT_RESULT=fail
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_status 0 \
    && assert_command_count "compose-up" 1; then
    pass "alert delivery failure does not block recovery"
  else
    fail "alert delivery failure does not block recovery"
  fi
}

test_socket_warning_is_rate_limited() {
  begin_case
  export PAPERCLIP_TEST_SOCKET_PERCENT=70
  run_watchdog
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog

  if assert_command_count "alert:warning:socket_pressure" 1; then
    pass "unchanged socket warning is rate limited"
  else
    fail "unchanged socket warning is rate limited"
  fi
}

test_recovery_transition_alerts_once() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  run_watchdog
  export PAPERCLIP_TEST_CONTAINER=ok
  export PAPERCLIP_TEST_NOW=1060
  run_watchdog
  export PAPERCLIP_TEST_NOW=1120
  run_watchdog

  if assert_command_count "alert:recovery:service_restored" 1; then
    pass "healthy transition emits exactly one recovery alert"
  else
    fail "healthy transition emits exactly one recovery alert"
  fi
}

test_logs_and_state_do_not_contain_credentials() {
  begin_case
  export TELEGRAM_BOT_TOKEN="watchdog-secret-token"
  export PAPERCLIP_TEST_SOCKET_PERCENT=70
  run_watchdog

  if ! grep -Fq "watchdog-secret-token" "$CASE_DIR/state/watchdog.log" \
    && ! grep -Fq "watchdog-secret-token" "$CASE_DIR/state/state"; then
    pass "logs and state do not contain credentials"
  else
    fail "logs and state do not contain credentials"
  fi
  unset TELEGRAM_BOT_TOKEN
}

test_unknown_argument_exits_before_probing() {
  begin_case
  run_watchdog --not-a-real-option

  if assert_status 64 \
    && [[ ! -s "$COMMAND_LOG" ]]; then
    pass "unknown argument exits before probes or actions"
  else
    fail "unknown argument exits before probes or actions"
  fi
}

test_reboot_cooldown_suppresses_second_reboot() {
  begin_case
  export PAPERCLIP_TEST_CONTAINER=down
  export PAPERCLIP_TEST_HOST=down
  export PAPERCLIP_TEST_PUBLIC=down
  local now
  for now in 1000 1060 1361 1662 1963 2023; do
    export PAPERCLIP_TEST_NOW="$now"
    run_watchdog
  done

  if assert_command_count "reboot-host" 1 \
    && assert_log_contains "action=suppressed reason=cooldown action=reboot-host"; then
    pass "reboot cooldown suppresses a second reboot"
  else
    fail "reboot cooldown suppresses a second reboot"
  fi
}

test_healthy_cycle_takes_no_action
test_first_container_failure_only_increments_counter
test_second_container_failure_runs_compose
test_dry_run_records_but_does_not_run_recovery
test_healthy_cycle_resets_failure_state
test_socket_below_warning_is_quiet
test_socket_warning_alerts_without_termination
test_first_socket_intervention_cycle_only_counts
test_second_socket_intervention_stops_allowlisted_owner
test_unknown_socket_owner_is_not_terminated
test_socket_pressure_alone_never_advances_reboot
test_docker_engine_failure_recovers_docker_and_compose
test_forwarding_failure_recovers_docker_and_compose
test_public_failure_restarts_cloudflare_only
test_persistent_public_failure_never_reboots
test_local_outage_reboots_after_three_failed_recoveries
test_local_recovery_before_third_attempt_prevents_reboot
test_compose_cooldown_suppresses_duplicate_recovery
test_docker_cooldown_suppresses_duplicate_recovery
test_cloudflare_cooldown_suppresses_duplicate_recovery
test_existing_lock_skips_cycle
test_invalid_state_fails_closed
test_alert_delivery_failure_does_not_block_recovery
test_socket_warning_is_rate_limited
test_recovery_transition_alerts_once
test_logs_and_state_do_not_contain_credentials
test_unknown_argument_exits_before_probing
test_reboot_cooldown_suppresses_second_reboot

printf '%s tests, %s failures\n' "$TESTS_RUN" "$TESTS_FAILED"
[[ "$TESTS_FAILED" -eq 0 ]]
