import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { PaperclipApiClient } from "./client.js";
import { readConfigFromEnv, type PaperclipMcpConfig } from "./config.js";
import { createIntegralOfficeToolDefinitions, TrackerApiClient } from "./integral-office.js";
import { createToolDefinitions } from "./tools.js";

export function createPaperclipMcpServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  const server = new McpServer({
    name: "paperclip",
    version: "0.1.0",
  });

  const client = new PaperclipApiClient(config);
  const tools = createToolDefinitions(client);
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.schema.shape, tool.execute);
  }

  return {
    server,
    tools,
    client,
  };
}

export function createIntegralOfficeMcpServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  if (!config.trackerApiUrl || !config.trackerApiKey) {
    throw new Error("TRACKER_API_URL and TRACKER_INTERNAL_API_TOKEN are required for Integral Office MCP");
  }

  const server = new McpServer({
    name: "integral-office",
    version: "0.1.0",
  });

  const paperclip = new PaperclipApiClient(config);
  const tracker = new TrackerApiClient({
    apiUrl: config.trackerApiUrl,
    apiKey: config.trackerApiKey,
  });
  const tools = createIntegralOfficeToolDefinitions({ paperclip, tracker });
  for (const tool of tools) {
    server.tool(tool.name, tool.description, tool.schema.shape, tool.execute);
  }

  return {
    server,
    tools,
    paperclip,
    tracker,
  };
}

export async function runServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  const { server } = createPaperclipMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export { readConfigFromEnv } from "./config.js";
