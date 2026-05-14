import { beforeEach, describe, expect, it, vi } from "vitest";
import { createIntegralOfficeToolDefinitions, TrackerApiClient } from "./integral-office.js";
import { PaperclipApiClient } from "./client.js";

function makePaperclipClient() {
  return new PaperclipApiClient({
    apiUrl: "http://localhost:3100/api",
    apiKey: "paperclip-token",
    companyId: "11111111-1111-1111-1111-111111111111",
    agentId: null,
    runId: "run-1",
  });
}

function getTool(name: string) {
  const tracker = new TrackerApiClient({
    apiUrl: "https://tracker.integral.sh",
    apiKey: "tracker-token",
  });
  const tool = createIntegralOfficeToolDefinitions({
    paperclip: makePaperclipClient(),
    tracker,
    audit: vi.fn(),
  }).find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool;
}

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("Integral Office MCP tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("fetches client scope from Tracker internal API", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ client: { name: "Symphony" } }));
    vi.stubGlobal("fetch", fetchMock);

    const response = await getTool("integralOfficeGetClientScope").execute({
      campaignId: "campaign-1",
    });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "https://tracker.integral.sh/api/internal/office/client-scope?campaignId=campaign-1",
    );
    expect(response.content[0]?.text).toContain("Symphony");
  });

  it("creates Paperclip tasks with idempotency metadata in the description", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({ identifier: "INT-500" }));
    vi.stubGlobal("fetch", fetchMock);

    await getTool("integralOfficeCreateTask").execute({
      title: "Set up Symphony scope",
      description: "Use approved plan.",
      assigneeAgentId: "22222222-2222-2222-2222-222222222222",
      idempotencyKey: "notion:page:office-task:setup",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/companies/11111111-1111-1111-1111-111111111111/issues");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toMatchObject({
      title: "Set up Symphony scope",
      assigneeAgentId: "22222222-2222-2222-2222-222222222222",
    });
    expect(JSON.parse(String(init.body)).description).toContain("Idempotency: notion:page:office-task:setup");
  });
});
