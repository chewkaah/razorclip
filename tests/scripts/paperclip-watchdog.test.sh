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

test_healthy_cycle_takes_no_action

printf '%s tests, %s failures\n' "$TESTS_RUN" "$TESTS_FAILED"
[[ "$TESTS_FAILED" -eq 0 ]]
