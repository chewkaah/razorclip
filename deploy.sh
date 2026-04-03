#!/bin/bash
# Razorclip deploy — pushes to GitHub then builds + restarts on Mac mini
set -e

MINI="ssh.integral.sh"
REMOTE_DIR="~/Dev/razorclip"

echo "🔪 Razorclip Deploy"
echo "==================="

# 1. Push local changes
echo "→ Pushing to GitHub..."
git push origin master 2>/dev/null && echo "  Pushed" || echo "  Already up to date"

# 2. Deploy on Mac mini
echo "→ Deploying on Mac mini ($MINI)..."
ssh "$MINI" bash -l << DEPLOY
export PATH="/Users/agent0/.local/share/fnm/aliases/default/bin:\$PATH"
cd $REMOTE_DIR
echo "  Pulling..."
git pull origin master 2>&1 | tail -1
echo "  Installing..."
pnpm install 2>&1 | tail -1
echo "  Building..."
pnpm --filter @paperclipai/shared build 2>&1 | tail -1
pnpm --filter @paperclipai/plugin-sdk build 2>&1 | tail -1
pnpm --filter @paperclipai/ui build 2>&1 | tail -1
pnpm --filter @paperclipai/server build 2>&1 | tail -1
echo "  Migrating..."
pnpm db:migrate 2>&1 | tail -1
echo "  Restarting..."
pkill -f "tsx.*src/index.ts" 2>/dev/null || true
sleep 2
# Reset only known-good plugins (NOT telegram — Hermes owns that connection)
docker exec razorclip-db-1 psql -U paperclip -d paperclip -c "UPDATE plugins SET status = 'ready', last_error = NULL WHERE package_name IN ('paperclip-plugin-acp', '@tomismeta/paperclip-aperture');" 2>/dev/null || true
nohup pnpm --filter @paperclipai/server dev > /tmp/razorclip.log 2>&1 &
sleep 4
echo "  Health: \$(curl -s http://localhost:3100/api/health | head -c 50)..."
DEPLOY

echo ""
echo "✅ Razorclip deployed to office.integral.sh"
