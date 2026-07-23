import { Router } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createPaperclipMcpServer, readConfigFromEnv } from "@paperclipai/mcp-server";

export function isIntegralOfficeMcpAuthorized(
  header: string | undefined,
  token: string | undefined = process.env.INTEGRAL_OFFICE_MCP_TOKEN,
): boolean {
  const normalized = token?.trim();
  if (!normalized) return false;
  return header === `Bearer ${normalized}`;
}

export function integralOfficeMcpRoutes() {
  const router = Router();

  router.all("/integral-office", async (req, res) => {
    if (!isIntegralOfficeMcpAuthorized(req.headers.authorization)) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    try {
      const { server } = createPaperclipMcpServer(readConfigFromEnv({
        ...process.env,
        PAPERCLIP_API_URL: process.env.PAPERCLIP_API_URL ?? "http://127.0.0.1:3100",
        PAPERCLIP_API_KEY: process.env.PAPERCLIP_API_KEY ?? process.env.INTEGRAL_OFFICE_PAPERCLIP_API_KEY,
        PAPERCLIP_MCP_TOOL_PRESET: "office",
        TRACKER_API_URL: process.env.TRACKER_API_URL ?? "https://tracker.integral.sh",
        OFFICE_MCP_SERVICE_KEY: process.env.OFFICE_MCP_SERVICE_KEY ?? process.env.TRACKER_INTERNAL_API_TOKEN,
      }));
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
      });
      res.on("close", () => {
        void transport.close();
        void server.close();
      });
      await server.connect(transport);
      await transport.handleRequest(req, res, req.body);
    } catch (err) {
      if (!res.headersSent) {
        res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
      }
    }
  });

  return router;
}
