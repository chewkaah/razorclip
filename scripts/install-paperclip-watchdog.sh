#!/usr/bin/env bash

set -u

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WATCHDOG_SOURCE="$SCRIPT_DIR/paperclip-watchdog.sh"
USER_PLIST_SOURCE="$SCRIPT_DIR/com.agent.paperclip-watchdog.plist"
ROOT_PLIST_SOURCE="$SCRIPT_DIR/com.integral.paperclip-network-capacity.plist"
USER_LABEL="com.agent.paperclip-watchdog"
ROOT_LABEL="com.integral.paperclip-network-capacity"
ROOT_PLIST_DEST="/Library/LaunchDaemons/$ROOT_LABEL.plist"
RECEIPT_DIR="/Library/Application Support/Integral/PaperclipWatchdog"
RECEIPT_FILE="$RECEIPT_DIR/network-capacity.receipt"

MODE=""
ALLOW_USER=0
INSTALL_USER="${PAPERCLIP_INSTALL_USER:-${SUDO_USER:-$(id -un)}}"

usage() {
  cat <<'EOF'
Usage:
  install-paperclip-watchdog.sh --dry-run [--allow-user]
  sudo install-paperclip-watchdog.sh --install [--allow-user]
  sudo install-paperclip-watchdog.sh --uninstall [--allow-user]
EOF
}

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run|--install|--uninstall)
        [[ -z "$MODE" ]] || return 64
        MODE="${1#--}"
        shift
        ;;
      --allow-user)
        ALLOW_USER=1
        shift
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
  [[ -n "$MODE" ]] || return 64
}

require_install_user() {
  if [[ "$INSTALL_USER" != "agent0" && "$ALLOW_USER" -ne 1 ]]; then
    printf 'Refusing production install for %s; expected agent0. Use --allow-user for an intentional alternate-user install.\n' "$INSTALL_USER" >&2
    return 77
  fi
}

install_home() {
  if [[ "${PAPERCLIP_INSTALL_TEST_MODE:-0}" == "1" ]]; then
    printf '/Users/%s' "$INSTALL_USER"
    return
  fi
  dscl . -read "/Users/$INSTALL_USER" NFSHomeDirectory 2>/dev/null | awk '{print $2}'
}

validate_sources() {
  [[ -f "$WATCHDOG_SOURCE" && -f "$USER_PLIST_SOURCE" && -f "$ROOT_PLIST_SOURCE" ]] || {
    printf 'Missing watchdog installation source files in %s\n' "$SCRIPT_DIR" >&2
    return 66
  }
  /bin/bash -n "$WATCHDOG_SOURCE" || return 65
  /usr/bin/plutil -lint "$USER_PLIST_SOURCE" >/dev/null || return 65
  /usr/bin/plutil -lint "$ROOT_PLIST_SOURCE" >/dev/null || return 65
}

require_root_for_mutation() {
  if [[ "${PAPERCLIP_INSTALL_TEST_MODE:-0}" != "1" && "$EUID" -ne 0 ]]; then
    printf 'Run --%s with sudo so the root LaunchDaemon can be managed.\n' "$MODE" >&2
    return 77
  fi
}

record_test_command() {
  printf '%s\n' "$1" >> "${PAPERCLIP_INSTALL_COMMAND_LOG:?test command log required}"
}

render_user_plist() {
  local destination="$1"
  local home="$2"
  local repo_path="$home/Dev/razorclip"
  sed \
    -e "s#/Users/agent0#$home#g" \
    -e "s#/Users/agent0/Dev/razorclip#$repo_path#g" \
    "$USER_PLIST_SOURCE" > "$destination"
}

record_network_values() {
  /bin/mkdir -p "$RECEIPT_DIR"
  /bin/chmod 700 "$RECEIPT_DIR"
  local tmp="$RECEIPT_FILE.$$"
  {
    printf 'net.inet.ip.portrange.first=%s\n' "$(/usr/sbin/sysctl -n net.inet.ip.portrange.first)"
    printf 'net.inet.ip.portrange.last=%s\n' "$(/usr/sbin/sysctl -n net.inet.ip.portrange.last)"
    printf 'net.inet.ip.portrange.hifirst=%s\n' "$(/usr/sbin/sysctl -n net.inet.ip.portrange.hifirst)"
    printf 'net.inet.ip.portrange.hilast=%s\n' "$(/usr/sbin/sysctl -n net.inet.ip.portrange.hilast)"
  } > "$tmp"
  /bin/chmod 600 "$tmp"
  /bin/mv "$tmp" "$RECEIPT_FILE"
}

restore_network_values() {
  [[ -r "$RECEIPT_FILE" ]] || return 0
  local key value
  while IFS='=' read -r key value; do
    case "$key" in
      net.inet.ip.portrange.first|net.inet.ip.portrange.last|net.inet.ip.portrange.hifirst|net.inet.ip.portrange.hilast)
        [[ "$value" =~ ^[0-9]+$ ]] || return 65
        /usr/sbin/sysctl -w "$key=$value" >/dev/null
        ;;
      *)
        return 65
        ;;
    esac
  done < "$RECEIPT_FILE"
}

install_services() {
  if [[ "${PAPERCLIP_INSTALL_TEST_MODE:-0}" == "1" ]]; then
    record_test_command "install:gui:$USER_LABEL"
    record_test_command "install:system:$ROOT_LABEL"
    return 0
  fi

  local home uid user_plist_dest rendered
  home="$(install_home)"
  [[ -n "$home" ]] || return 67
  uid="$(id -u "$INSTALL_USER")"
  user_plist_dest="$home/Library/LaunchAgents/$USER_LABEL.plist"
  rendered="$(mktemp "${TMPDIR:-/tmp}/paperclip-watchdog-plist.XXXXXX")"
  render_user_plist "$rendered" "$home"

  /bin/mkdir -p "$home/Library/LaunchAgents" "$home/agent/paperclip-watchdog"
  /usr/sbin/chown "$INSTALL_USER":staff "$home/agent/paperclip-watchdog"
  /bin/chmod 700 "$home/agent/paperclip-watchdog"
  /usr/bin/install -o "$INSTALL_USER" -g staff -m 0644 "$rendered" "$user_plist_dest"
  /bin/rm -f "$rendered"

  [[ -f "$RECEIPT_FILE" ]] || record_network_values
  /usr/bin/install -o root -g wheel -m 0644 "$ROOT_PLIST_SOURCE" "$ROOT_PLIST_DEST"

  /bin/launchctl bootout "gui/$uid/$USER_LABEL" >/dev/null 2>&1 || true
  /bin/launchctl asuser "$uid" /bin/launchctl bootstrap "gui/$uid" "$user_plist_dest"
  /bin/launchctl bootout "system/$ROOT_LABEL" >/dev/null 2>&1 || true
  /bin/launchctl bootstrap system "$ROOT_PLIST_DEST"
}

uninstall_services() {
  if [[ "${PAPERCLIP_INSTALL_TEST_MODE:-0}" == "1" ]]; then
    record_test_command "bootout:gui:$USER_LABEL"
    record_test_command "bootout:system:$ROOT_LABEL"
    return 0
  fi

  local home uid user_plist_dest
  home="$(install_home)"
  uid="$(id -u "$INSTALL_USER")"
  user_plist_dest="$home/Library/LaunchAgents/$USER_LABEL.plist"

  /bin/launchctl bootout "gui/$uid/$USER_LABEL" >/dev/null 2>&1 || true
  /bin/launchctl bootout "system/$ROOT_LABEL" >/dev/null 2>&1 || true
  /bin/rm -f "$user_plist_dest" "$ROOT_PLIST_DEST"
  restore_network_values
}

main() {
  parse_args "$@" || return $?
  require_install_user || return $?

  case "$MODE" in
    dry-run)
      validate_sources || return $?
      printf 'Validated watchdog scripts and launchd definitions for %s; no system state changed.\n' "$INSTALL_USER"
      ;;
    install)
      require_root_for_mutation || return $?
      validate_sources || return $?
      install_services || return $?
      printf 'Installed %s and %s for %s.\n' "$USER_LABEL" "$ROOT_LABEL" "$INSTALL_USER"
      ;;
    uninstall)
      require_root_for_mutation || return $?
      uninstall_services || return $?
      printf 'Removed %s and %s; Paperclip data and existing supervisors were left untouched.\n' "$USER_LABEL" "$ROOT_LABEL"
      ;;
  esac
}

main "$@"
