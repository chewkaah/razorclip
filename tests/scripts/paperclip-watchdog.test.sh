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

test_healthy_cycle_takes_no_action
test_first_container_failure_only_increments_counter
test_second_container_failure_runs_compose
test_dry_run_records_but_does_not_run_recovery
test_healthy_cycle_resets_failure_state

printf '%s tests, %s failures\n' "$TESTS_RUN" "$TESTS_FAILED"
[[ "$TESTS_FAILED" -eq 0 ]]
