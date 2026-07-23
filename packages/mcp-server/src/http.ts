import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { PaperclipMcpConfig } from "./config.js";

export interface HostedMcpTransport {
  handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void>;
}

export function createHostedMcpTransport() {
  return new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
}

export function isAuthorizedBearerToken(
  authHeader: string | undefined,
  expectedToken: string,
): boolean {
  if (!authHeader) return false;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) return false;

  const presented = Buffer.from(match[1], "utf8");
  const expected = Buffer.from(expectedToken, "utf8");
  if (presented.length !== expected.length) return false;
  return timingSafeEqual(presented, expected);
}

function writeJson(res: ServerResponse, statusCode: number, body: unknown): void {
  const encoded = JSON.stringify(body);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(encoded),
  });
  res.end(encoded);
}

export function createHostedMcpRequestListener(
  config: Pick<PaperclipMcpConfig, "httpBearerToken" | "httpHealthPath" | "httpMcpPath">,
  transport: HostedMcpTransport,
) {
  const bearerToken = config.httpBearerToken;
  if (!bearerToken) {
    throw new Error("Hosted MCP transport requires PAPERCLIP_MCP_BEARER_TOKEN");
  }

  return async (req: IncomingMessage, res: ServerResponse) => {
    const method = req.method ?? "GET";
    const pathname = new URL(req.url ?? "/", "http://127.0.0.1").pathname;

    if (pathname === config.httpHealthPath && method === "GET") {
      writeJson(res, 200, { ok: true, transport: "http" });
      return;
    }

    if (pathname !== config.httpMcpPath) {
      writeJson(res, 404, { error: "Not found" });
      return;
    }

    if (!isAuthorizedBearerToken(req.headers.authorization, bearerToken)) {
      res.setHeader("WWW-Authenticate", 'Bearer realm="paperclip-mcp"');
      writeJson(res, 401, { error: "Unauthorized" });
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        writeJson(res, 500, {
          error: error instanceof Error ? error.message : "Internal server error",
        });
      } else {
        res.end();
      }
    }
  };
}

export async function startHostedMcpServer(
  config: Pick<PaperclipMcpConfig, "httpBearerToken" | "httpHealthPath" | "httpHost" | "httpMcpPath" | "httpPort">,
  transport = createHostedMcpTransport(),
): Promise<{ httpServer: Server; transport: StreamableHTTPServerTransport }> {
  const server = createServer(createHostedMcpRequestListener(config, transport));

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(config.httpPort, config.httpHost, () => {
      server.off("error", reject);
      resolve();
    });
  });

  return {
    httpServer: server,
    transport,
  };
}
