import { afterEach, describe, expect, it, vi } from "vitest";
import { createServer } from "node:http";
import { createHostedMcpRequestListener, isAuthorizedBearerToken, type HostedMcpTransport } from "./http.js";

async function withServer(
  transport: HostedMcpTransport,
  test: (baseUrl: string, handleRequest: ReturnType<typeof vi.fn>) => Promise<void>,
) {
  const handleRequest = vi.fn(transport.handleRequest);
  const server = createServer(createHostedMcpRequestListener({
    httpBearerToken: "secret-token",
    httpHealthPath: "/health",
    httpMcpPath: "/mcp",
  }, { handleRequest }));

  await new Promise<void>((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  const address = server.address();
  if (!address || typeof address === "string") {
    server.close();
    throw new Error("Expected TCP server address");
  }

  try {
    await test(`http://127.0.0.1:${address.port}`, handleRequest);
  } finally {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) reject(error);
        else resolve();
      });
    });
  }
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("hosted MCP http transport", () => {
  it("rejects missing or invalid bearer tokens", async () => {
    await withServer(
      {
        handleRequest: async () => {},
      },
      async (baseUrl, handleRequest) => {
        const missing = await fetch(`${baseUrl}/mcp`);
        expect(missing.status).toBe(401);
        expect(missing.headers.get("www-authenticate")).toContain("Bearer");

        const invalid = await fetch(`${baseUrl}/mcp`, {
          headers: { Authorization: "Bearer wrong-token" },
        });
        expect(invalid.status).toBe(401);
        expect(handleRequest).not.toHaveBeenCalled();
      },
    );
  });

  it("allows health checks without auth and delegates authorized MCP requests", async () => {
    await withServer(
      {
        handleRequest: async (_req, res) => {
          res.writeHead(204).end();
        },
      },
      async (baseUrl, handleRequest) => {
        const health = await fetch(`${baseUrl}/health`);
        expect(health.status).toBe(200);
        await expect(health.json()).resolves.toEqual({ ok: true, transport: "http" });

        const response = await fetch(`${baseUrl}/mcp`, {
          headers: { Authorization: "Bearer secret-token" },
        });
        expect(response.status).toBe(204);
        expect(handleRequest).toHaveBeenCalledTimes(1);
      },
    );
  });

  it("compares bearer tokens safely", () => {
    expect(isAuthorizedBearerToken("Bearer secret-token", "secret-token")).toBe(true);
    expect(isAuthorizedBearerToken("Bearer wrong-token", "secret-token")).toBe(false);
    expect(isAuthorizedBearerToken(undefined, "secret-token")).toBe(false);
  });
});
