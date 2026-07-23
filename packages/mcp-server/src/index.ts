import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { PaperclipApiClient } from "./client.js";
import { readConfigFromEnv, type PaperclipMcpConfig } from "./config.js";
import { createHostedMcpTransport, startHostedMcpServer } from "./http.js";
import { createToolDefinitions } from "./tools.js";

export { readConfigFromEnv } from "./config.js";

function resolveToolSchemaShape(schema: z.ZodTypeAny): z.ZodRawShape {
  if (schema instanceof z.ZodObject) {
    return schema.shape;
  }
  if (schema instanceof z.ZodEffects) {
    const inner = schema.innerType();
    if (inner instanceof z.ZodObject) {
      return inner.shape;
    }
  }
  throw new Error("MCP tool schemas must be object schemas");
}

export function createPaperclipMcpServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  const server = new McpServer({
    name: "paperclip",
    version: "0.1.0",
  });

  const client = new PaperclipApiClient(config);
  const tools = createToolDefinitions(client, config.toolPreset);
  for (const tool of tools) {
    server.tool(tool.name, tool.description, resolveToolSchemaShape(tool.schema), tool.execute);
  }

  return {
    server,
    tools,
    client,
  };
}

export async function runStdioServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  const { server } = createPaperclipMcpServer(config);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

export async function runHttpServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  const { server } = createPaperclipMcpServer(config);
  const transport = createHostedMcpTransport();
  await server.connect(transport);
  await startHostedMcpServer(config, transport);
}

export async function runServer(config: PaperclipMcpConfig = readConfigFromEnv()) {
  if (config.transport === "http") {
    await runHttpServer(config);
    return;
  }
  await runStdioServer(config);
}
