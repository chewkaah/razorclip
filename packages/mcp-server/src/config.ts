export interface PaperclipMcpConfig {
  apiUrl: string;
  apiKey: string;
  companyId: string | null;
  agentId: string | null;
  runId: string | null;
  toolPreset: "paperclip" | "office";
  transport: "stdio" | "http";
  trackerApiUrl: string | null;
  trackerApiKey: string | null;
  httpHost: string;
  httpPort: number;
  httpMcpPath: string;
  httpHealthPath: string;
  httpBearerToken: string | null;
}

function nonEmpty(value: string | undefined): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function stripTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function normalizePath(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) return fallback;
  return trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
}

function parseTransport(value: string | undefined): "stdio" | "http" {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "stdio") return "stdio";
  if (normalized === "http") return "http";
  throw new Error(`Unsupported PAPERCLIP_MCP_TRANSPORT: ${value}`);
}

function parseToolPreset(value: string | undefined): "paperclip" | "office" {
  const normalized = value?.trim().toLowerCase();
  if (!normalized || normalized === "paperclip") return "paperclip";
  if (normalized === "office") return "office";
  throw new Error(`Unsupported PAPERCLIP_MCP_TOOL_PRESET: ${value}`);
}

function parsePort(value: string | undefined, fallback: number): number {
  if (!value?.trim()) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PAPERCLIP_MCP_PORT: ${value}`);
  }
  return parsed;
}

export function normalizeApiUrl(apiUrl: string): string {
  const trimmed = stripTrailingSlash(apiUrl.trim());
  return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
}

export function readConfigFromEnv(env: NodeJS.ProcessEnv = process.env): PaperclipMcpConfig {
  const apiUrl = nonEmpty(env.PAPERCLIP_API_URL);
  if (!apiUrl) {
    throw new Error("Missing PAPERCLIP_API_URL");
  }
  const apiKey = nonEmpty(env.PAPERCLIP_API_KEY);
  if (!apiKey) {
    throw new Error("Missing PAPERCLIP_API_KEY");
  }

  const transport = parseTransport(env.PAPERCLIP_MCP_TRANSPORT);
  const toolPreset = parseToolPreset(env.PAPERCLIP_MCP_TOOL_PRESET);
  const httpBearerToken = nonEmpty(env.PAPERCLIP_MCP_BEARER_TOKEN);
  if (transport === "http" && !httpBearerToken) {
    throw new Error("Missing PAPERCLIP_MCP_BEARER_TOKEN for http transport");
  }
  const trackerApiUrl = nonEmpty(env.TRACKER_API_URL);
  const trackerApiKey = nonEmpty(env.OFFICE_MCP_SERVICE_KEY);
  if (toolPreset === "office") {
    if (!trackerApiUrl) {
      throw new Error("Missing TRACKER_API_URL for office tool preset");
    }
    if (!trackerApiKey) {
      throw new Error("Missing OFFICE_MCP_SERVICE_KEY for office tool preset");
    }
  }

  return {
    apiUrl: normalizeApiUrl(apiUrl),
    apiKey,
    companyId: nonEmpty(env.PAPERCLIP_COMPANY_ID),
    agentId: nonEmpty(env.PAPERCLIP_AGENT_ID),
    runId: nonEmpty(env.PAPERCLIP_RUN_ID),
    toolPreset,
    transport,
    trackerApiUrl: trackerApiUrl ? normalizeApiUrl(trackerApiUrl) : null,
    trackerApiKey,
    httpHost: nonEmpty(env.PAPERCLIP_MCP_HOST) ?? "127.0.0.1",
    httpPort: parsePort(env.PAPERCLIP_MCP_PORT, 8787),
    httpMcpPath: normalizePath(env.PAPERCLIP_MCP_PATH, "/mcp"),
    httpHealthPath: normalizePath(env.PAPERCLIP_MCP_HEALTH_PATH, "/health"),
    httpBearerToken,
  };
}
