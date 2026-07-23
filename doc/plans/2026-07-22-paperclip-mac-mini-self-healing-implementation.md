# Paperclip Mac Mini Self-Healing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a tested, launchd-managed watchdog that diagnoses and recovers the Integral Studio Paperclip stack without mutating Paperclip work or creating restart loops.

**Architecture:** A one-shot Bash watchdog records probe counters and cooldowns in an atomic state file, classifies the failed infrastructure layer, and performs at most one bounded recovery action per invocation. launchd runs it every minute, a root LaunchDaemon reapplies the widened ephemeral port range at boot, and an idempotent installer manages both services. A command-injection shell harness proves the recovery state machine without touching production services.

**Tech Stack:** Bash 3.2-compatible shell, macOS launchd/plist, Docker Compose, curl, sysctl, lsof/netstat, shell test harness

---

## File Map

- Create `scripts/paperclip-watchdog.sh`: probes, state machine, recovery actions,
  cooldowns, Telegram notifications, dry-run mode.
- Create `tests/scripts/paperclip-watchdog.test.sh`: deterministic fake-command
  harness and behavioral regression suite.
- Create `scripts/com.agent.paperclip-watchdog.plist`: 60-second user LaunchAgent.
- Create `scripts/com.integral.paperclip-network-capacity.plist`: boot-time root
  sysctl LaunchDaemon.
- Create `scripts/install-paperclip-watchdog.sh`: validate, install, uninstall,
  bootstrap, and print rollback guidance.
- Modify `package.json`: expose the deterministic shell suite as
  `test:paperclip-watchdog`.
- Modify `doc/plans/2026-07-22-paperclip-mac-mini-self-healing-design.md`: record
  the final test command and any implementation-specific path names only if the
  implementation proves the design text inaccurate.

### Task 1: Build the state-machine regression harness

**Files:**
- Create: `tests/scripts/paperclip-watchdog.test.sh`
- Modify: `package.json`

- [ ] **Step 1: Add a failing healthy-cycle test**

Create a dependency-free test runner with temporary directories and fake
commands. Every fake appends its invocation to `$COMMAND_LOG`. The initial test
must invoke the missing watchdog and assert:

```bash
run_watchdog
assert_status 0
assert_log_contains "classification=healthy"
assert_command_not_called "restart-docker"
assert_command_not_called "compose-up"
assert_command_not_called "restart-cloudflare"
assert_command_not_called "reboot-host"
```

The harness passes probe results through environment overrides:

```bash
export PAPERCLIP_TEST_MODE=1
export PAPERCLIP_STATE_DIR="$CASE_DIR/state"
export PAPERCLIP_TEST_SOCKET_PERCENT=10
export PAPERCLIP_TEST_DOCKER_ENGINE=ok
export PAPERCLIP_TEST_CONTAINER=ok
export PAPERCLIP_TEST_HOST=ok
export PAPERCLIP_TEST_PUBLIC=ok
export PAPERCLIP_TEST_CLOUDFLARE=ok
export PAPERCLIP_TEST_NOW=1000
```

- [ ] **Step 2: Register the test command**

Add this exact root script:

```json
"test:paperclip-watchdog": "bash tests/scripts/paperclip-watchdog.test.sh"
```

- [ ] **Step 3: Run the test and verify RED**

Run:

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
```

Expected: non-zero with `scripts/paperclip-watchdog.sh` missing.

- [ ] **Step 4: Commit the failing harness**

```bash
git add tests/scripts/paperclip-watchdog.test.sh package.json
git commit -m "test: define Paperclip watchdog contract"
```

### Task 2: Implement probes, atomic state, and healthy behavior

**Files:**
- Create: `scripts/paperclip-watchdog.sh`
- Test: `tests/scripts/paperclip-watchdog.test.sh`

- [ ] **Step 1: Add failing tests for counters and dry-run**

Add isolated cases proving:

```text
one failed container probe -> container_failures=1, no action
second failed container probe in the same state dir -> compose-up once
--dry-run on the second failure -> proposed compose-up logged, command absent
successful cycle after a failure -> all probe and recovery counters reset
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
```

Expected: healthy case still fails because the watchdog does not exist.

- [ ] **Step 3: Implement the watchdog foundation**

Use Bash 3.2-compatible syntax and these entry points:

```bash
main
acquire_lock
load_state
save_state
probe_socket_capacity
probe_docker_engine
probe_container
probe_host_health
probe_public_health
probe_cloudflare
classify_failure
increment_failure_counters
choose_recovery_action
perform_action
verify_after_action
send_alert
```

The state file is written to a temporary file, mode `0600`, then renamed. The
lock is an atomic `mkdir`; a trap removes it. State loading accepts only known
numeric keys and known enum values rather than sourcing arbitrary shell.

In `PAPERCLIP_TEST_MODE=1`, probe results and time come only from the documented
test overrides and actions append stable names to `$PAPERCLIP_TEST_COMMAND_LOG`.
Outside test mode, use bounded `curl`, `docker`, `launchctl`, `sysctl`,
`netstat`, and `lsof` commands.

Argument parsing accepts:

```text
--dry-run
--state-dir PATH
--help
```

Unknown or missing arguments exit `64` before any action.

- [ ] **Step 4: Run the focused test and verify GREEN**

Run:

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
```

Expected: all current watchdog cases pass.

- [ ] **Step 5: Commit the foundation**

```bash
git add scripts/paperclip-watchdog.sh tests/scripts/paperclip-watchdog.test.sh
git commit -m "feat: add layered Paperclip health probes"
```

### Task 3: Implement socket-pressure containment

**Files:**
- Modify: `scripts/paperclip-watchdog.sh`
- Modify: `tests/scripts/paperclip-watchdog.test.sh`

- [ ] **Step 1: Add failing socket threshold tests**

Add cases for:

```text
69% -> healthy socket state and no alert
70% -> warning alert, no termination
85% once -> counter only
85% twice with allowlisted owner -> stop-hermes-dashboard once
85% twice without allowlisted owner -> critical alert, no termination
socket pressure with all health probes passing -> reboot counter remains zero
```

Test mode exposes `PAPERCLIP_TEST_HERMES_OWNER=allowlisted|unknown|none`.

- [ ] **Step 2: Verify RED**

Run the focused shell suite and expect the first 70% assertion to fail.

- [ ] **Step 3: Implement pressure calculation and containment**

Calculate unique ephemeral capacity from the low/high ranges returned by
`sysctl`. Count deduplicated TCP rows in consuming states. Log the percentage,
`TIME_WAIT` count, and top contributors without command lines or environment
values.

Only stop a process when both are true:

1. `lsof` proves it owns sockets on `127.0.0.1:9120`;
2. its executable path or launchd label exactly matches the configured
   Hermes desktop/dashboard allowlist.

Never match by name substring or port alone. Never stop any configured Hermes
gateway label.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
git add scripts/paperclip-watchdog.sh tests/scripts/paperclip-watchdog.test.sh
git commit -m "feat: contain Paperclip socket pressure safely"
```

### Task 4: Implement layered recovery and escalation

**Files:**
- Modify: `scripts/paperclip-watchdog.sh`
- Modify: `tests/scripts/paperclip-watchdog.test.sh`

- [ ] **Step 1: Add failing recovery-matrix tests**

Add exact cases for:

```text
Docker engine down twice -> restart-docker then compose-up
container down twice -> compose-up only
container internal health up plus host down twice -> restart-docker then compose-up
host up plus public down twice -> restart-cloudflare only
unchanged Cloudflare-only failure across six cycles -> reboot-host never called
local failure across two complete failed recovery cycles -> no reboot
local failure across exactly three complete failed recovery cycles -> reboot-host once
recovered local health before cycle three -> recovery cycle resets
Docker cooldown -> duplicate restart suppressed
Compose cooldown -> duplicate compose-up suppressed
Cloudflare cooldown -> duplicate tunnel restart suppressed
reboot cooldown -> second reboot suppressed
```

- [ ] **Step 2: Verify RED**

Run the focused suite and expect the Docker recovery case to fail.

- [ ] **Step 3: Implement one-action-per-cycle recovery**

Implement recovery with these defaults:

```text
consecutive failures: 2
Compose cooldown: 300 seconds
Cloudflare cooldown: 300 seconds
Docker Desktop cooldown: 900 seconds
reboot cooldown: 21600 seconds
failed local recovery cycles before reboot: 3
```

The Docker action quits and opens Docker Desktop, waits for engine readiness,
then runs canonical Compose `up -d`. Compose recovery never uses `down`, `-v`,
`pull`, or `build`. Cloudflare recovery kickstarts only its configured system
label. Reboot eligibility requires failed local health; tunnel-only cycles never
increment `local_recovery_cycles`.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
git add scripts/paperclip-watchdog.sh tests/scripts/paperclip-watchdog.test.sh
git commit -m "feat: recover Paperclip infrastructure by layer"
```

### Task 5: Harden alerts, locking, and log redaction

**Files:**
- Modify: `scripts/paperclip-watchdog.sh`
- Modify: `tests/scripts/paperclip-watchdog.test.sh`

- [ ] **Step 1: Add failing safety tests**

Add cases proving:

```text
pre-existing lock -> exit 0 and no probes/actions
invalid state values -> fail closed and no disruptive action
Telegram failure -> selected recovery still occurs
unchanged warning inside 60 minutes -> no duplicate alert
recovery transition -> exactly one recovery alert
injected token/header/email strings -> absent from state and logs
unknown CLI argument -> exit 64 and no probes/actions
```

- [ ] **Step 2: Verify RED**

Run the focused suite and expect the locking or invalid-state case to fail.

- [ ] **Step 3: Implement hardening**

Resolve Telegram token exactly like `scripts/auth-healthcheck.sh`, but never
include the token in command logs. Use `curl --data-urlencode`, a 10-second
timeout, and fail open. Sanitize logged values to stable enums, integer counts,
known service labels, and known health URLs.

Rate-limit warning alerts to 3600 seconds per unchanged class. Always log action,
recovery, and reboot decisions.

- [ ] **Step 4: Verify GREEN and commit**

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
git add scripts/paperclip-watchdog.sh tests/scripts/paperclip-watchdog.test.sh
git commit -m "fix: harden Paperclip watchdog safety gates"
```

### Task 6: Add launchd services and installer

**Files:**
- Create: `scripts/com.agent.paperclip-watchdog.plist`
- Create: `scripts/com.integral.paperclip-network-capacity.plist`
- Create: `scripts/install-paperclip-watchdog.sh`
- Modify: `tests/scripts/paperclip-watchdog.test.sh`

- [ ] **Step 1: Add failing static and installer tests**

Assert:

```text
both plist files pass plutil -lint
watchdog plist uses StartInterval=60 and RunAtLoad=true
watchdog plist is a one-shot service with no KeepAlive
network plist runs sysctl for first=10000 and hifirst=10000
installer --dry-run changes no launchd state
installer refuses a non-agent0 production install unless --allow-user is set
installer --uninstall targets only the two new labels
installer output never contains the injected Telegram token
```

- [ ] **Step 2: Verify RED**

Run the focused suite and expect missing plist/installer failures.

- [ ] **Step 3: Implement launchd definitions**

The user plist calls:

```text
/Users/agent0/Dev/razorclip/scripts/paperclip-watchdog.sh
--state-dir
/Users/agent0/agent/paperclip-watchdog
```

The root plist invokes `/usr/sbin/sysctl -w` with both approved assignments.
Use absolute log paths and a controlled path:

```text
/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
```

- [ ] **Step 4: Implement installer and rollback**

Supported modes:

```text
install-paperclip-watchdog.sh --dry-run
sudo install-paperclip-watchdog.sh --install
sudo install-paperclip-watchdog.sh --uninstall
```

Validate `bash -n`, `plutil -lint`, executable permissions, Docker, curl,
launchctl, sysctl, and configured paths before bootstrapping anything. Install
the user plist as `agent0`, the network plist as root-owned `0644`, and the
watchdog as executable. On uninstall, boot out only the two new labels and
restore the four pre-install range values recorded in a root-owned receipt.

- [ ] **Step 5: Verify GREEN and commit**

```bash
npx --yes pnpm@9.15.4 test:paperclip-watchdog
git add scripts/com.agent.paperclip-watchdog.plist \
  scripts/com.integral.paperclip-network-capacity.plist \
  scripts/install-paperclip-watchdog.sh \
  tests/scripts/paperclip-watchdog.test.sh
git commit -m "feat: install Paperclip watchdog with launchd"
```

### Task 7: Complete repository verification and PR

**Files:**
- Modify: implementation files only if verification exposes defects

- [ ] **Step 1: Run focused verification**

```bash
bash -n scripts/paperclip-watchdog.sh
bash -n scripts/install-paperclip-watchdog.sh
plutil -lint scripts/com.agent.paperclip-watchdog.plist
plutil -lint scripts/com.integral.paperclip-network-capacity.plist
npx --yes pnpm@9.15.4 test:paperclip-watchdog
git diff --check origin/master...HEAD
```

Expected: all commands exit zero.

- [ ] **Step 2: Run repository verification**

Build the plugin SDK before the repository checks:

```bash
npx --yes pnpm@9.15.4 --filter @paperclipai/plugin-sdk build
npx --yes pnpm@9.15.4 -r typecheck
npx --yes pnpm@9.15.4 test:run
npx --yes pnpm@9.15.4 -r build
```

If unrelated baseline failures remain, rerun them on `origin/master` with the
same Node/pnpm environment and document the comparison in the PR. Do not change
unrelated product code in this watchdog PR.

- [ ] **Step 3: Review the design acceptance criteria**

Map all 14 acceptance criteria in the design to a passing automated assertion
or a clearly deferred production fault-injection rollout step. No code claim may
substitute for the production-only 24-hour observation.

- [ ] **Step 4: Push and create the PR**

```bash
git push -u origin agent/paperclip-self-healing
gh pr create --draft \
  --base master \
  --head agent/paperclip-self-healing \
  --title "Add self-healing watchdog for Paperclip on the Mac mini" \
  --body-file /tmp/paperclip-watchdog-pr.md
```

The PR body must include incident root cause, layer-by-layer behavior, safety
invariants, focused verification, baseline comparison, and the production
rollout steps intentionally left for after review.

- [ ] **Step 5: Resolve PR checks and review**

Watch required checks, inspect logs for each failure, fix only failures caused
by this branch, rerun the relevant local command, push the fix, and repeat until
the PR is merge-ready. Mark the PR ready only after required checks pass.
