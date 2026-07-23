#!/bin/sh
# Paperclip container -> host Hermes shim.
#
# Victor (and any future hermes_local agent) invokes `hermes` from inside the
# Debian container. Instead of running a linux-native hermes that has no access
# to the mac host's MCPs, Obsidian vault, or filesystem, we SSH to the host and
# run the host-native hermes.
#
# Setup per host: see Obsidian note 03-Infrastructure/Hermes-Install-Per-Machine.md
# Required on host:
#   - hermes installed and on the login PATH (see ~/.zshenv)
#   - Remote Login enabled
#   - sshd AcceptEnv PAPERCLIP_API_KEY
#   - ~/.ssh/paperclip_hermes pubkey authorized for agent0 with from="127.0.0.1,::1"
# Required mount: ~/.ssh/paperclip_hermes -> /paperclip/.ssh/paperclip_hermes:ro

set -eu

shell_quote() {
  # POSIX single-quote escaping for arguments forwarded through ssh.
  # ssh sends the remote command as a string for the user's login shell to parse,
  # so `ssh host hermes "$@"` loses argv boundaries for prompts with spaces.
  printf "'%s'" "$(printf '%s' "$1" | sed "s/'/'\\\\''/g")"
}

remote_cmd="hermes"
for arg in "$@"; do
  remote_cmd="$remote_cmd $(shell_quote "$arg")"
done

exec ssh -i /paperclip/.ssh/paperclip_hermes \
  -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile=/paperclip/.ssh/known_hosts \
  -o SendEnv=PAPERCLIP_API_KEY \
  -o LogLevel=ERROR \
  agent0@host.docker.internal "$remote_cmd"
