# Paperclip Mac Mini Self-Healing Design

Status: Approved design, ready for implementation planning
Date: 2026-07-22
Deployment: Integral Studio Paperclip on the `agent0` Mac mini
Public URL: `https://office.integral.sh`

## 1. Purpose

Keep the production Paperclip control plane available through the failure modes
observed during the July 2026 Rex email-routing incident, without disturbing
healthy agent work or hiding repeated infrastructure failures.

This is host-infrastructure recovery. It may restore socket capacity, Docker,
the Razorclip Compose stack, and the Cloudflare connector. It must not reassign
issues, retry agent plans, edit company data, or otherwise become a task
orchestrator. That preserves Paperclip's V1 rule that work recovery remains
manual and explicit.

## 2. Incident Summary

Rex received the full forwarded email, but a later Hermes fallback reduced the
request to the current reply text. At the same time, Paperclip roster requests
returned a Cloudflare `502`, so Rex could not verify or route work to the live
agent roster.

The Paperclip outage was not an application crash:

- the `razorclip-server-1` container was healthy internally;
- Docker's host port forwarding for port `3100` was unavailable;
- the Mac had approximately 38,099 TCP sockets in `TIME_WAIT`;
- the configured ephemeral port range was `49152-65535`, only 16,384 ports;
- Hermes desktop/dashboard traffic on `127.0.0.1:9120` accounted for
  approximately 17,478 loopback entries;
- restarting only the affected Hermes desktop/dashboard processes, widening the
  ephemeral port range, and restoring Docker returned Paperclip to service;
- the root-managed Cloudflare connector was healthy after local service
  recovery.

This design addresses the Paperclip availability side of that incident. Rex's
forward parsing and queued outage tolerance are separate repairs and will have
their own design.

## 3. Goals

1. Detect socket pressure before Docker networking becomes unusable.
2. Distinguish application, container, Docker forwarding, and Cloudflare
   failures.
3. Apply the smallest recovery action that can restore service.
4. Preserve healthy Paperclip processes and agent runs whenever possible.
5. Prevent restart loops with consecutive-failure gates, locks, and cooldowns.
6. Escalate a persistent local outage to a Mac mini reboot only after bounded
   recovery attempts fail.
7. Alert the operator with enough context to understand what failed and what
   the watchdog changed.
8. Make every decision testable without disrupting production.

## 4. Non-Goals

- Automatically reassigning, recreating, or retrying Paperclip issues.
- Changing Rex email ingestion or forwarded-message parsing.
- Queuing Rex requests while Paperclip is unavailable.
- Replacing Docker Desktop, Cloudflare Tunnel, launchd, or Compose.
- Killing Hermes gateways or other healthy agent runtimes.
- Persisting credentials, tokens, email bodies, or agent prompts in watchdog
  logs.
- Treating a public-tunnel-only failure as permission to reboot the Mac.

## 5. Existing Production Topology

The design assumes the current production arrangement:

- `agent0` user session runs Docker Desktop.
- the Razorclip stack is defined by the repository's Compose configuration;
- the Paperclip server container is `razorclip-server-1`;
- Paperclip listens on container and host port `3100`;
- `com.agent.razorclip` keeps the Compose process supervised;
- `com.cloudflare.cloudflared` is a root LaunchDaemon and proxies
  `office.integral.sh` to `http://localhost:3100`;
- Hermes gateways are independent launchd services;
- Telegram credentials are already available through
  `/Users/agent0/.hermes/.env`, following `scripts/auth-healthcheck.sh`.

All paths and service labels are installer configuration values rather than
scattered literals. The defaults target this topology.

## 6. Proposed Components

### 6.1 `scripts/paperclip-watchdog.sh`

A Bash watchdog that performs one bounded observation-and-recovery cycle. It is
safe to run repeatedly, obtains a non-blocking lock before probing, and exits
quickly when another cycle is active.

Modes:

- default: probe and recover according to policy;
- `--dry-run`: collect real observations and log the actions that would be
  taken, but perform no disruptive command;
- `--state-dir PATH`: use an isolated state directory for tests;
- injected command paths and probe overrides: allow deterministic tests without
  Docker Desktop, launchd, Cloudflare, or a socket storm.

### 6.2 `scripts/com.agent.paperclip-watchdog.plist`

A user LaunchAgent installed for `agent0`.

- runs every 60 seconds and at login;
- uses the user's GUI session so it can restart Docker Desktop safely;
- does not use `KeepAlive`, because the script is a one-shot cycle;
- writes launchd stdout/stderr to the watchdog state directory;
- uses a controlled `PATH` and absolute script path.

### 6.3 `scripts/com.integral.paperclip-network-capacity.plist`

A root LaunchDaemon that applies the approved ephemeral-port lower bounds at
boot:

```text
net.inet.ip.portrange.first=10000
net.inet.ip.portrange.hifirst=10000
```

It makes the incident-time mitigation durable across reboot. It performs only
these idempotent `sysctl` writes and logs the resulting values. The watchdog
checks the values but never elevates privileges or edits them itself.

### 6.4 `scripts/install-paperclip-watchdog.sh`

An idempotent installer that:

1. validates required commands, repo paths, plist syntax, and current user;
2. creates the state directory with user-only write permissions;
3. installs and bootstraps the user LaunchAgent;
4. installs the root network-capacity LaunchDaemon with root ownership;
5. runs the watchdog in `--dry-run` mode;
6. prints the installed labels, state path, and rollback commands.

The installer may request `sudo` only for the root LaunchDaemon. It never copies
or prints Telegram tokens or Paperclip credentials.

### 6.5 Runtime state

Runtime state lives outside the repository at:

```text
/Users/agent0/agent/paperclip-watchdog/
```

Files:

- `state`: shell-readable key/value state written atomically;
- `watchdog.log`: timestamped decisions, observations, and recovery results;
- `watchdog.lock`: non-blocking cycle lock;
- `launchd.out.log` and `launchd.err.log`: launchd process output.

The state file contains only counters and timestamps:

- consecutive failures by probe;
- current recovery cycle count;
- last recovery action and result;
- last action timestamps for cooldown enforcement;
- last alert class and timestamp.

No API keys, auth headers, email content, issue data, or agent prompts are
stored.

## 7. Probe Model

Each cycle records the following probes independently.

### 7.1 Socket capacity

Read the effective ephemeral range from:

- `net.inet.ip.portrange.first`;
- `net.inet.ip.portrange.last`;
- `net.inet.ip.portrange.hifirst`;
- `net.inet.ip.portrange.hilast`.

Count TCP entries whose local port is within either configured ephemeral range
and whose state consumes or retains an outbound port, including
`ESTABLISHED`, `SYN_SENT`, `FIN_WAIT_*`, `CLOSE_WAIT`, `LAST_ACK`, and
`TIME_WAIT`. Deduplicate identical socket rows before calculating use.

Capacity percentage is:

```text
counted ephemeral TCP entries / unique configured ephemeral ports * 100
```

Also record `TIME_WAIT` count and the top local process/port contributors when
available. This is an operational pressure signal, not a claim that every
socket maps one-to-one to a globally unavailable tuple.

Thresholds:

- below 70%: normal;
- 70% through 84%: warning and rate-limited alert, no process termination;
- 85% or higher for two consecutive cycles: intervention eligible.

### 7.2 Docker engine

Verify that the Docker CLI can query the engine within a bounded timeout. A
failed engine probe is distinct from a failed Paperclip container probe.

### 7.3 Paperclip container

Verify:

- `razorclip-server-1` exists and is running;
- its Docker health state is healthy when a healthcheck is defined;
- `GET /api/health` succeeds from inside the container network namespace.

An in-container health success proves the application and its local database
path are responsive without relying on Docker host forwarding.

### 7.4 Host port

Request `http://127.0.0.1:3100/api/health` with a short connect and total
timeout. This distinguishes a healthy container behind broken Docker
forwarding from an application failure.

### 7.5 Public endpoint

Request `https://office.integral.sh/api/health` with a short timeout. Record the
HTTP status without following an unrelated redirect.

### 7.6 Cloudflare connector

Inspect the root-managed `com.cloudflare.cloudflared` service state and recent
exit status. This is supporting evidence; the public health probe remains the
end-to-end authority.

## 8. Failure Classification

Probe results map to one primary failure class per cycle:

| Class | Evidence |
|---|---|
| `healthy` | container, host, and public health all pass |
| `socket_pressure` | socket use is at or above 85% for two cycles |
| `docker_engine_down` | Docker engine probe fails |
| `container_down` | Docker works, but container or in-container health fails |
| `docker_forwarding_broken` | in-container health passes and host health fails |
| `cloudflare_path_broken` | host health passes and public health fails |
| `compound_local_outage` | local probes fail in more than one layer |

Classification order is socket pressure, Docker engine, container, host
forwarding, then public tunnel. Only one disruptive recovery action is attempted
per cycle. The next cycle re-probes the entire stack before deciding what comes
next.

## 9. Recovery Policy

### 9.1 General gates

- A disruptive action requires the relevant failure on two consecutive
  watchdog cycles.
- Every action is followed by a bounded readiness wait and a full re-probe.
- A successful re-probe clears the related counters and recovery-cycle count.
- A failed action increments the local recovery-cycle count.
- The lock prevents overlapping actions.
- A per-action cooldown prevents repeated restarts even if state remains bad.
- Telegram delivery failure is logged and never blocks recovery.

### 9.2 Socket-pressure recovery

At 70%, alert only.

At 85% for two cycles:

1. identify contributors with active sockets on `127.0.0.1:9120`;
2. stop only the allowlisted Hermes desktop/dashboard owner;
3. preserve all Hermes gateway launchd labels and processes;
4. wait for socket pressure to decline;
5. alert with before/after counts and whether service health changed.

The allowlist is based on the installed Hermes desktop/dashboard launchd label
or executable path. Matching port `9120` alone is insufficient. If ownership
cannot be proven against the allowlist, the watchdog alerts and takes no
termination action.

Socket pressure by itself never authorizes a Mac reboot. A reboot is considered
only if Paperclip also remains locally unavailable under section 9.7.

### 9.3 Docker engine recovery

When Docker engine access fails for two cycles:

1. quit Docker Desktop through the `agent0` GUI session;
2. relaunch Docker Desktop;
3. wait with a bounded timeout for the engine to answer;
4. restore the Razorclip Compose stack;
5. run all probes.

Cooldown: 15 minutes between Docker Desktop restarts.

### 9.4 Container recovery

When Docker is available but the Paperclip container or its internal health
fails for two cycles:

1. run the canonical Compose `up -d` command for the Razorclip stack;
2. do not remove volumes, recreate the database, pull images, or rebuild;
3. wait for in-container health;
4. run all probes.

If Compose cannot restore internal health, the next eligible cycle may restart
Docker Desktop. Cooldown: 5 minutes between Compose restorations.

### 9.5 Docker forwarding recovery

When in-container health passes but host port `3100` fails for two cycles:

1. restart Docker Desktop;
2. restore the Compose stack;
3. verify internal health before checking host and public health;
4. preserve volumes and existing Paperclip data.

Cooldown: 15 minutes between Docker Desktop restarts.

### 9.6 Cloudflare-only recovery

When host health passes but public health fails for two cycles:

1. kickstart only `com.cloudflare.cloudflared`;
2. wait for its service state and the public endpoint;
3. leave Docker and Paperclip untouched.

Cooldown: 5 minutes between Cloudflare restarts.

A Cloudflare-only failure can alert and retry indefinitely, but it can never
increment the local reboot counter or authorize a Mac reboot.

### 9.7 Final escalation

A Mac reboot is eligible only when all of these are true:

1. in-container or host-local Paperclip health remains unavailable;
2. the failure survived three complete local recovery cycles;
3. the watchdog attempted every recovery action relevant to the observed
   layers, including Docker/Compose restoration;
4. no recovery action is still inside its readiness window;
5. the reboot cooldown has expired;
6. the state file records the exact failed probes and attempts.

Before rebooting, send a critical alert. If alert delivery fails, log the
failure and continue because alert transport must not deadlock recovery.

After reboot, launchd reapplies network capacity, starts the existing
supervisors, and resumes the watchdog. The watchdog sends a recovery alert only
after container, host, and public health all pass.

Cooldown: one reboot per 6 hours.

## 10. Preserving Agent Work

The watchdog minimizes interference in this order:

1. Cloudflare restart changes only the public connector.
2. Compose recovery uses `up -d` and preserves volumes.
3. Docker Desktop restart is used only for engine or forwarding failure.
4. Reboot is the final local-outage escalation.

Before restarting Docker or rebooting, the watchdog records whether Paperclip
reports queued or running heartbeat runs when the API is reachable. This
observation is included in logs and alerts, but it does not block recovery from
an actual local outage. The watchdog does not cancel, retry, or mutate those
runs.

No disruptive action is taken when container, host, and public health are all
passing, even if an individual agent is in `error`.

## 11. Alerts and Observability

Telegram uses the existing token-resolution pattern from
`scripts/auth-healthcheck.sh`:

1. `TELEGRAM_BOT_TOKEN` environment override;
2. otherwise read `TELEGRAM_BOT_TOKEN` from
   `/Users/agent0/.hermes/.env`.

Alerts contain:

- host and service name;
- failure class;
- relevant counts/status codes;
- consecutive failure count;
- action taken or suppressed;
- cooldown remaining;
- post-action health result.

Alert classes are rate-limited independently:

- warning: once per 60 minutes while unchanged;
- recovery action: once per action;
- recovery success: once when transitioning back to healthy;
- critical/reboot: every eligible event.

Tokens and request headers are never logged. URLs are limited to the known
health endpoints.

## 12. Configuration Contract

Production defaults are defined together near the top of the watchdog and may
be overridden by environment variables from the LaunchAgent:

- repo and Compose file paths;
- container name;
- local and public health URLs;
- Cloudflare launchd label;
- Hermes desktop/dashboard allowlist;
- state directory;
- socket thresholds;
- consecutive-failure requirement;
- readiness timeouts and cooldowns;
- Telegram env path and chat ID;
- injected command paths for tests.

Invalid configuration fails closed: log and alert if possible, but do not run a
disruptive command.

## 13. Testing Strategy

### 13.1 Static validation

- `bash -n` on both scripts;
- `shellcheck` with documented exclusions, if installed;
- `plutil -lint` on both plists;
- installer path and permission assertions;
- secret/credential pattern scan of generated logs and fixtures.

### 13.2 Deterministic command-injection tests

A shell test harness runs the watchdog against a temporary state directory with
fake `docker`, `curl`, `launchctl`, `sysctl`, socket-inspection, process-control,
and reboot commands.

Required cases:

1. fully healthy: no action and counters reset;
2. one failed probe: counter increments, no disruptive action;
3. socket warning at 70%: alert only;
4. socket intervention at 85% for two cycles: stop allowlisted desktop owner;
5. socket contributor not allowlisted: alert, no process termination;
6. dead container: Compose restoration only;
7. healthy container with dead host forwarding: Docker restart then Compose;
8. healthy host with failed public endpoint: Cloudflare restart only;
9. Cloudflare remains down: no reboot counter;
10. local outage survives exactly three complete recovery cycles: one reboot;
11. local outage recovers before cycle three: no reboot;
12. action cooldown: suppress duplicate restart;
13. overlapping invocation: second process exits without probing;
14. Telegram failure: recovery continues and warning is logged;
15. `--dry-run`: reports every proposed action and performs none;
16. successful recovery: counters clear and one recovery alert is sent;
17. logs contain no injected credential values.

### 13.3 Production fault injection

Run during an operator-observed maintenance window:

1. install and run a healthy `--dry-run` cycle;
2. stop only `razorclip-server-1` and verify Compose restoration;
3. stop only `com.cloudflare.cloudflared` and verify tunnel-only restoration;
4. simulate socket and reboot thresholds through injected dry-run probes;
5. confirm the live roster endpoint and `office.integral.sh` recover;
6. confirm no healthy Hermes gateway was stopped;
7. confirm the database, companies, issues, comments, and heartbeat history
   remain present.

The production test must not create a real socket storm or trigger a real
reboot.

## 14. Rollout

1. Land scripts, plists, installer, and deterministic tests in the repo.
2. Run static and injected tests locally.
3. Install the watchdog on the Mac mini in dry-run mode for at least 30 minutes.
4. Review classifications, socket counts, and alert rate.
5. Install the root network-capacity LaunchDaemon and verify effective values.
6. Enable recovery actions while keeping reboot disabled.
7. Run container and Cloudflare production fault injection.
8. Observe at least 24 hours.
9. Enable final reboot escalation.
10. Record the installed version and rollback commands in the existing
    infrastructure recovery note.

## 15. Rollback

The installer provides an uninstall path that:

1. boots out and removes `com.agent.paperclip-watchdog`;
2. boots out and removes
   `com.integral.paperclip-network-capacity`;
3. restores the previously recorded four ephemeral-range `sysctl` values for
   the current boot;
4. leaves watchdog logs/state for diagnosis unless explicitly purged;
5. leaves Docker volumes, Paperclip data, Cloudflare configuration, Hermes
   services, and existing supervisors untouched.

Disabling the new watchdog does not disable the existing
`com.agent.razorclip`, `com.cloudflare.cloudflared`, or auth-healthcheck
services.

## 16. Acceptance Criteria

The repair is complete when:

1. the watchdog runs every 60 seconds without overlapping itself;
2. healthy service produces no disruptive action;
3. socket warnings occur at 70% and allowlisted intervention at 85%;
4. two consecutive failures are required before every disruptive action;
5. each failure layer selects only its documented recovery action;
6. Docker forwarding failure is repaired automatically;
7. Cloudflare-only failure cannot reboot the Mac;
8. local failure can reboot only after three failed recovery cycles;
9. cooldowns prevent restart loops;
10. alerts and logs contain no secrets;
11. all deterministic tests pass;
12. container-stop and Cloudflare-stop production tests recover;
13. Paperclip data and healthy agent state survive the tests;
14. the live health endpoint remains stable for 24 hours before reboot
    escalation is enabled.

## 17. Follow-On Work

After this design is implemented and verified, design the separate Rex
outage-tolerance repair:

- preserve the complete forwarded email through all fallback paths;
- accept email requests while Paperclip is unavailable;
- enqueue a durable routing intent with an idempotency key;
- retry roster lookup and task creation after Paperclip recovers;
- send a human-readable queued, delivered, or failed status back to the email
  thread.
