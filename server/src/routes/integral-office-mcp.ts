import { Router } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createIntegralOfficeMcpServer } from "@paperclipai/mcp-server";
import { readConfigFromEnv } from "@paperclipai/mcp-server";

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
      const { server } = createIntegralOfficeMcpServer(readConfigFromEnv());
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
