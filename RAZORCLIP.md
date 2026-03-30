# Razorclip

> Custom fork of [paperclipai/paperclip](https://github.com/paperclipai/paperclip) — an AI agent orchestration platform redesigned as a mobile-first command center for managing AI coding agents and the businesses they run.

**Repo:** `github.com/chewkaah/razorclip`
**Branch:** `master`
**Upstream:** `paperclipai/paperclip`

---

## What Is Razorclip?

Razorclip takes the open-source Paperclip agent management platform and transforms it into a premium, chat-driven **Agent Command Center** with:

- **Pixel-perfect UI** rebuilt from Google Stitch designs ("Kinetic Terminal" design system)
- **Business Intelligence** layer (Stripe, Mercury, Notion CRM, Analytics, Social)
- **Connections management** for 18+ integrations (MCPs, OAuth, API keys)
- **USER.md system** — per-user context documents that agents read
- **Light + dark mode** with theme toggle
- **Company switcher** with multi-tenant support
- **Floating chat bar** that persists across desktop pages

## What Changed from Upstream Paperclip

### 1. Complete UI Redesign
Every page rebuilt from Stitch HTML reference files. The entire Paperclip Layout is replaced with `RazorclipShell` — a custom sidebar + top bar.

**New pages:**
| Page | Route | Description |
|------|-------|-------------|
| Home | `/home` | Command center with Business Pulse, agent avatars, live activity |
| Agent Grid | `/agents/grid` | 3-column card grid with avatars, task snippets, 8W sparklines |
| Agent Profile | `/agents/:id/profile` | 3-column: hero + terminal stream + completions |
| Health | `/health` | Founder's briefing with schedule, metrics, Stripe/Mercury, intelligence |
| Connections | `/connections` | 18 integrations + installed MCP plugins |
| Clients | `/clients` | 2-column: client list + detail with health score |
| Approvals | `/approvals/queue` | Multi-card grid with signal strength bars |
| Issue Thread | `/issues/:id/thread-view` | 3-column: priority list + detail + operations thread |
| Chat | `/chat` | Restyled with agent avatars, gradient borders, glass input |
| Profile | `/profile` | USER.md editor, voice/tone selector, preferences |
| Auth | `/auth` | Razorclip-branded login/signup |

### 2. Backend Services
| Service | Routes | Description |
|---------|--------|-------------|
| User Profiles | `/user/profile` | USER.md context + preferences + display name |
| Connections | `/companies/:id/connections` | 18 integration slots, seeds on first access |
| BI Layer | `/companies/:id/bi/pulse` | Aggregated metrics from bi_clients table |

### 3. Database Tables (Migration 0046)
- `user_profiles` — per-user context markdown + preferences
- `connections` + `connection_sync_logs` — integration management
- `bi_clients` + `bi_client_projects` — client tracking
- `bi_snapshots` + `bi_alerts` — metric cache + intelligence alerts

### 4. Hermes Adapter
Merged from upstream PR #1955 + patched adapter from `chewkaah/hermes-paperclip-adapter`:
- AGENTS.md injection, TERMINAL_CWD, --yolo flag, session-ID validation

### 5. Design System
- CSS variables: `--rc-surface`, `--rc-primary`, `--rc-on-surface`, etc.
- Glass cards with `backdrop-blur: 24px`
- Agent accent colors (Dante=purple, Brent=blue, Rex=green, Scout=orange, Nova=pink, Victor=gold)
- Material Symbols Outlined icons
- Inter font throughout

---

## Deploy

### Prerequisites
- Docker + Docker Compose
- A `BETTER_AUTH_SECRET` (any random string)
- Optional: `ANTHROPIC_API_KEY`, `OPENROUTER_API_KEY`

### Quick Start (Docker)

```bash
# Clone
git clone git@github.com:chewkaah/razorclip.git
cd razorclip

# Create .env
cat > .env << 'EOF'
BETTER_AUTH_SECRET=your-secret-here-change-this
ANTHROPIC_API_KEY=sk-ant-...
# OPENROUTER_API_KEY=sk-or-...
# MERCURY_API_KEY=...
# STRIPE_SECRET_KEY=...
# OP_SERVICE_ACCOUNT_TOKEN=...
EOF

# Build and run
docker compose up --build -d

# Access at http://localhost:3100
# First user to sign up becomes instance admin
```

### Environment Variables

**Required:**
| Variable | Description |
|----------|-------------|
| `BETTER_AUTH_SECRET` | Auth session encryption key (any random string) |

**Recommended:**
| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | For Claude-based agents |
| `OPENROUTER_API_KEY` | For multi-model agent support |

**Optional (BI integrations):**
| Variable | Description |
|----------|-------------|
| `STRIPE_SECRET_KEY` | Financial data for Health dashboard |
| `MERCURY_API_KEY` | Banking data for cash position |
| `NOTION_INTEGRATION_TOKEN` | CRM client sync |
| `APOLLO_API_KEY` | Pipeline and lead data |
| `VERCEL_API_TOKEN` | Website analytics |
| `GA4_PROPERTY_ID` | Google Analytics traffic |
| `LINKEDIN_CLIENT_ID` / `_SECRET` | Social metrics |
| `OP_SERVICE_ACCOUNT_TOKEN` | 1Password secrets backend |

### Ports
- `3100` — Razorclip web app (UI + API)
- `5432` — PostgreSQL (Docker internal)

### Cloudflare Tunnel (Production)
```bash
# After docker compose is running
cloudflared tunnel --url http://localhost:3100
```

---

## Local Development

```bash
# Install deps
pnpm install

# Start embedded PostgreSQL + server + UI
pnpm dev

# Or run separately:
pnpm dev:server  # Express on :3100
pnpm dev:ui      # Vite on :5173

# Generate migration after schema changes
pnpm db:generate
pnpm db:migrate
```

### Build Order (for manual builds)
```bash
pnpm --filter @paperclipai/shared build
pnpm --filter @paperclipai/plugin-sdk build
pnpm --filter @paperclipai/ui build
pnpm --filter @paperclipai/server build
```

---

## Architecture

```
razorclip/
├── ui/                          # React 19 + Vite + Tailwind v4
│   ├── src/
│   │   ├── components/kinetic/  # Razorclip design system components
│   │   │   ├── RazorclipShell   # Main layout (sidebar + top bar)
│   │   │   ├── GlassCard, AgentChip, StatusDot, MetricPill, etc.
│   │   │   └── MessageBubble, LiveExecutionLog, SystemActionCard
│   │   ├── pages/               # All page components
│   │   ├── api/                 # Typed API clients
│   │   └── hooks/               # React hooks (useUserProfile, etc.)
│   ├── stitch-reference/        # 18 Stitch HTML source files (design bible)
│   └── public/                  # favicon.svg (razor icon)
├── server/                      # Node.js + Express
│   ├── src/routes/              # REST API routes
│   │   ├── user-profile.ts      # USER.md CRUD
│   │   ├── connections.ts       # Integration management
│   │   ├── bi.ts                # Business intelligence
│   │   └── chat.ts, agents.ts, issues.ts, etc. (upstream)
│   └── src/services/            # Business logic
│       ├── user-profile.ts
│       ├── connections.ts
│       ├── bi.ts
│       └── chat.ts, heartbeat.ts, etc. (upstream)
├── packages/
│   ├── db/                      # Drizzle ORM schemas + migrations
│   │   └── src/schema/
│   │       ├── user_profiles.ts
│   │       ├── connections.ts
│   │       ├── bi_clients.ts
│   │       ├── bi_snapshots.ts
│   │       └── ... (upstream tables)
│   ├── shared/                  # Shared types + constants
│   └── adapters/                # AI model adapters
├── docker-compose.yml           # PostgreSQL + app
├── Dockerfile                   # Multi-stage production build
└── RAZORCLIP.md                 # This file
```

## Git Remotes

```bash
origin    → github.com/chewkaah/razorclip (push here)
upstream  → github.com/paperclipai/paperclip (sync upstream fixes)
```

### Syncing Upstream
```bash
git remote add upstream https://github.com/paperclipai/paperclip.git  # first time only
git fetch upstream
git merge upstream/master
# Resolve conflicts, then push
git push origin master
```

---

## Agents

The platform manages AI coding agents. The core 6 for Integral Studio:

| Agent | Role | Accent Color |
|-------|------|-------------|
| Dante | Music Marketing | Purple `#8B5CF6` |
| Brent | Brand Campaigns | Blue `#3B82F6` |
| Rex | Campaign Ops | Green `#10B981` |
| Scout | Sales/Outreach | Orange `#F59E0B` |
| Nova | Creative/Ads | Pink `#EC4899` |
| Victor | CEO/Strategy | Gold `#EAB308` |

Each agent has: avatar images, accent gradients, status rings, task snippets, 8W activity sparklines, and a profile page with live terminal stream.

---

## License

Same as upstream Paperclip — see [LICENSE](./LICENSE).
