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
exec ssh -i /paperclip/.ssh/paperclip_hermes \
  -o StrictHostKeyChecking=accept-new \
  -o UserKnownHostsFile=/paperclip/.ssh/known_hosts \
  -o SendEnv=PAPERCLIP_API_KEY \
  -o LogLevel=ERROR \
  agent0@host.docker.internal hermes "$@"
