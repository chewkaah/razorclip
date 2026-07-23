# syntax=docker/dockerfile:1.20
FROM node:lts-trixie-slim AS base
RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates gosu curl gh git wget ripgrep python3 python3-pip \
  && rm -rf /var/lib/apt/lists/* \
  && corepack enable

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY cli/package.json cli/
COPY server/package.json server/
COPY ui/package.json ui/
COPY packages/shared/package.json packages/shared/
COPY packages/db/package.json packages/db/
COPY packages/adapter-utils/package.json packages/adapter-utils/
COPY packages/mcp-server/package.json packages/mcp-server/
COPY packages/adapters/claude-local/package.json packages/adapters/claude-local/
COPY packages/adapters/codex-local/package.json packages/adapters/codex-local/
COPY packages/adapters/cursor-local/package.json packages/adapters/cursor-local/
COPY packages/adapters/gemini-local/package.json packages/adapters/gemini-local/
COPY packages/adapters/openclaw-gateway/package.json packages/adapters/openclaw-gateway/
COPY packages/adapters/opencode-local/package.json packages/adapters/opencode-local/
COPY packages/adapters/pi-local/package.json packages/adapters/pi-local/
COPY packages/plugins/sdk/package.json packages/plugins/sdk/
COPY --parents packages/plugins/sandbox-providers/./*/package.json packages/plugins/sandbox-providers/
COPY packages/plugins/paperclip-plugin-fake-sandbox/package.json packages/plugins/paperclip-plugin-fake-sandbox/
COPY patches/ patches/

RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app /app
COPY . .
RUN pnpm --filter @paperclipai/ui build
RUN pnpm --filter @paperclipai/plugin-sdk build
RUN pnpm --filter @paperclipai/mcp-server build
RUN pnpm --filter @paperclipai/server build
RUN test -f server/dist/index.js || (echo "ERROR: server build output missing" && exit 1)

FROM base AS production
WORKDIR /app
COPY --chown=node:node --from=build /app /app
RUN npm install --global --omit=dev @anthropic-ai/claude-code@latest @openai/codex@latest opencode-ai \
  && apt-get update \
  && apt-get install -y --no-install-recommends openssh-client jq \
  && rm -rf /var/lib/apt/lists/* \
  && mkdir -p /paperclip \
  && chown node:node /paperclip

# Hermes is not installed in the container. The hermes_local adapter (Victor)
# spawns /Users/agent0/.local/bin/hermes, which we provide as a shim that SSHes
# to the host and runs the host-native hermes. This gives Victor full mac
# capabilities (Obsidian vault, MCPs, filesystem). The host-side SSH key is
# bind-mounted via docker-compose. See Obsidian note
# 03-Infrastructure/Hermes-Install-Per-Machine.md for the per-host setup.
COPY docker/hermes-shim.sh /usr/local/bin/hermes
# paperclip-post-comment: retry-safe comment posting for codex_local agents (INT-58)
COPY docker/paperclip-post-comment.py /usr/local/bin/paperclip-post-comment
# ntn-integral: wrapper that loads Notion auth from Paperclip secrets.
COPY docker/ntn-integral.sh /usr/local/bin/ntn-integral
# Notion CLI (ntn) gives Razorclip agents deterministic Notion API access without
# relying on hosted MCP OAuth callbacks. Keep the version pinned for rebuilds.
ARG NTN_VERSION=v0.13.2
RUN set -eux; \
  arch="$(uname -m)"; \
  case "$arch" in \
    aarch64|arm64) ntn_target="aarch64-unknown-linux-musl" ;; \
    x86_64|amd64) ntn_target="x86_64-unknown-linux-musl" ;; \
    *) echo "Unsupported ntn architecture: $arch" >&2; exit 1 ;; \
  esac; \
  tmp_dir="$(mktemp -d)"; \
  curl -fsSL "https://ntn.dev/releases/${NTN_VERSION}/ntn-${ntn_target}.tar.gz" -o "$tmp_dir/ntn.tar.gz"; \
  tar -xzf "$tmp_dir/ntn.tar.gz" -C "$tmp_dir"; \
  install -m 0755 "$tmp_dir/ntn-${ntn_target}/ntn" /usr/local/bin/ntn; \
  rm -rf "$tmp_dir"; \
  chmod +x /usr/local/bin/hermes /usr/local/bin/paperclip-post-comment /usr/local/bin/ntn-integral; \
  mkdir -p /Users/agent0/.local/bin /paperclip/.hermes; \
  ln -sf /usr/local/bin/hermes /Users/agent0/.local/bin/hermes; \
  ln -sfn /paperclip/.hermes /Users/agent0/.hermes; \
  chown -R node:node /Users/agent0 /paperclip/.hermes

ENV NODE_ENV=production \
  HOME=/paperclip \
  HOST=0.0.0.0 \
  PORT=3100 \
  SERVE_UI=true \
  PAPERCLIP_HOME=/paperclip \
  PAPERCLIP_INSTANCE_ID=default \
  PAPERCLIP_CONFIG=/paperclip/instances/default/config.json \
  PAPERCLIP_DEPLOYMENT_MODE=authenticated \
  PAPERCLIP_DEPLOYMENT_EXPOSURE=private

EXPOSE 3100

USER node
CMD ["node", "--import", "./server/node_modules/tsx/dist/loader.mjs", "server/dist/index.js"]
