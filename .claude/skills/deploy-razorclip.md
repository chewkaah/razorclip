---
name: deploy-razorclip
description: "Deploy Razorclip to the Mac mini production server at office.integral.sh. Use this skill whenever the user says 'deploy', 'push to production', 'ship it', 'deploy razorclip', 'update the server', 'push to the mini', 'deploy to office', or any variation of wanting to get their latest code running on the production Mac mini. Also trigger when the user asks to restart the server, rebuild, or redeploy."
---

# Deploy Razorclip

Deploy the Razorclip application to the production Mac mini server. This pushes code to GitHub, SSHs into the Mac mini, pulls, builds, migrates the database, and restarts the server.

## Production Environment

- **Server**: Mac mini (Apple Silicon) at `agent0@192.168.1.184`
- **SSH Key**: `~/.ssh/id_ed25519`
- **Repo on mini**: `~/Dev/razorclip`
- **App URL**: `office.integral.sh` (via Cloudflare Tunnel)
- **Server port**: 3100
- **DB**: PostgreSQL via Docker (`razorclip-db-1`)

## Deploy Steps

Execute these steps in order. If any step fails, stop and report the error.

### Step 1: Push local changes to GitHub

Check if there are uncommitted changes in the local Razorclip repo. If there are, stage, commit, and push them. If the tree is clean, just ensure we're pushed to origin.

```bash
cd /Users/chuka/Dev/razorclip
git add -A
git status --short
# If there are changes, commit them (ask the user for a commit message or generate one)
git push origin master
```

### Step 2: Deploy on the Mac mini via SSH

Run the full build + deploy sequence on the mini. The PATH export is critical — without it, `pnpm` and `node` won't be found because they're installed via `fnm`.

```bash
ssh -o IdentitiesOnly=yes -i ~/.ssh/id_ed25519 agent0@192.168.1.184 bash -l << 'DEPLOY'
export PATH="/Users/agent0/.local/share/fnm/aliases/default/bin:$PATH"
cd ~/Dev/razorclip

echo "=== Pull ==="
git pull origin master

echo "=== Install ==="
pnpm install 2>&1 | tail -3

echo "=== Build ==="
pnpm --filter @paperclipai/shared build 2>&1 | tail -1
pnpm --filter @paperclipai/plugin-sdk build 2>&1 | tail -1
pnpm --filter @paperclipai/ui build 2>&1 | tail -3
pnpm --filter @paperclipai/server build 2>&1 | tail -1

echo "=== Migrate ==="
pnpm db:migrate 2>&1 | tail -3

echo "=== Restart ==="
pkill -f "tsx.*src/index.ts" 2>/dev/null && echo "Killed old server" || echo "No server running"
sleep 2
docker exec razorclip-db-1 psql -U paperclip -d paperclip -c "UPDATE plugins SET status = 'ready', last_error = NULL;" 2>/dev/null || echo "Plugin reset skipped"
nohup pnpm --filter @paperclipai/server dev > /tmp/razorclip.log 2>&1 &
sleep 5

echo "=== Health Check ==="
curl -s http://localhost:3100/api/health
DEPLOY
```

### Step 3: Verify

After the SSH command completes, check the health response. A successful deploy returns:
```json
{"status":"ok","version":"0.3.1",...}
```

Report the result to the user. If the health check fails, read the last 20 lines of `/tmp/razorclip.log` on the mini to diagnose.

## Troubleshooting

If SSH fails with "Permission denied":
- The key at `~/.ssh/id_ed25519` may not be in the mini's `~/.ssh/authorized_keys`
- See Obsidian note `03-Infrastructure/Mac-Mini-SSH.md` for the key to add

If the build fails:
- Plugin-sdk must build before server (`pnpm --filter @paperclipai/plugin-sdk build`)
- The build order matters: shared → plugin-sdk → UI → server

If the server won't start:
- Check if port 3100 is occupied: `lsof -i :3100` on the mini
- The Docker server container sometimes auto-starts and steals the port. Kill it: `docker stop razorclip-server-1 && docker rm razorclip-server-1`
- Plugin state can get stuck. Reset: `docker exec razorclip-db-1 psql -U paperclip -d paperclip -c "UPDATE plugins SET status = 'ready', last_error = NULL;"`

If migration fails:
- Check for duplicate table creation errors — may need `IF NOT EXISTS` in migration SQL
- The migration file is at `packages/db/src/migrations/`
