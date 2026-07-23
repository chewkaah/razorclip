import { beforeEach, describe, expect, it, vi } from "vitest";
import { PaperclipApiClient } from "./client.js";
import { createToolDefinitions } from "./tools.js";

function makeClient() {
  return new PaperclipApiClient({
    apiUrl: "http://localhost:3100/api",
    apiKey: "token-123",
    companyId: "11111111-1111-1111-1111-111111111111",
    agentId: "22222222-2222-2222-2222-222222222222",
    runId: "33333333-3333-3333-3333-333333333333",
    toolPreset: "paperclip",
    transport: "stdio",
    trackerApiUrl: "http://tracker.local/api",
    trackerApiKey: "office-secret",
    httpHost: "127.0.0.1",
    httpPort: 8787,
    httpMcpPath: "/mcp",
    httpHealthPath: "/health",
    httpBearerToken: null,
  });
}

function getTool(name: string) {
  const tool = createToolDefinitions(makeClient()).find((candidate) => candidate.name === name);
  if (!tool) throw new Error(`Missing tool ${name}`);
  return tool;
}

function mockJsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("paperclip MCP tools", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("adds auth headers and run id to mutating requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ ok: true }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipUpdateIssue");
    await tool.execute({
      issueId: "PAP-1135",
      status: "done",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://localhost:3100/api/issues/PAP-1135");
    expect(init.method).toBe("PATCH");
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer token-123");
    expect((init.headers as Record<string, string>)["X-Paperclip-Run-Id"]).toBe(
      "33333333-3333-3333-3333-333333333333",
    );
  });

  it("uses default company id for company-scoped list tools", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse([{ id: "issue-1" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipListIssues");
    const response = await tool.execute({});

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string];
    expect(String(url)).toBe(
      "http://localhost:3100/api/companies/11111111-1111-1111-1111-111111111111/issues",
    );
    expect(response.content[0]?.text).toContain("issue-1");
  });

  it("uses default agent id for checkout requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "PAP-1135", status: "in_progress" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipCheckoutIssue");
    await tool.execute({
      issueId: "PAP-1135",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      agentId: "22222222-2222-2222-2222-222222222222",
      expectedStatuses: ["todo", "backlog", "blocked"],
    });
  });

  it("defaults issue document format to markdown", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ key: "plan", latestRevisionNumber: 2 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipUpsertIssueDocument");
    await tool.execute({
      issueId: "PAP-1135",
      key: "plan",
      body: "# Updated",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      format: "markdown",
      body: "# Updated",
    });
  });

  it("controls issue workspace services through the current execution workspace", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        currentExecutionWorkspace: {
          id: "44444444-4444-4444-8444-444444444444",
          runtimeServices: [],
        },
      }))
      .mockResolvedValueOnce(mockJsonResponse({
        operation: { id: "operation-1" },
        workspace: {
          id: "44444444-4444-4444-8444-444444444444",
          runtimeServices: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              serviceName: "web",
              status: "running",
              url: "http://127.0.0.1:5173",
            },
          ],
        },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipControlIssueWorkspaceServices");
    await tool.execute({
      issueId: "PAP-1135",
      action: "restart",
      workspaceCommandId: "web",
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [lookupUrl, lookupInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(lookupUrl)).toBe("http://localhost:3100/api/issues/PAP-1135/heartbeat-context");
    expect(lookupInit.method).toBe("GET");

    const [controlUrl, controlInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(String(controlUrl)).toBe(
      "http://localhost:3100/api/execution-workspaces/44444444-4444-4444-8444-444444444444/runtime-services/restart",
    );
    expect(controlInit.method).toBe("POST");
    expect(JSON.parse(String(controlInit.body))).toEqual({
      workspaceCommandId: "web",
    });
  });

  it("waits for an issue workspace runtime service URL", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(mockJsonResponse({
        currentExecutionWorkspace: {
          id: "44444444-4444-4444-8444-444444444444",
          runtimeServices: [
            {
              id: "55555555-5555-4555-8555-555555555555",
              serviceName: "web",
              status: "running",
              healthStatus: "healthy",
              url: "http://127.0.0.1:5173",
            },
          ],
        },
      }));
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipWaitForIssueWorkspaceService");
    const response = await tool.execute({
      issueId: "PAP-1135",
      serviceName: "web",
      timeoutSeconds: 1,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.content[0]?.text).toContain("http://127.0.0.1:5173");
  });

  it("creates suggest_tasks interactions with the expected issue-scoped payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "interaction-1", kind: "suggest_tasks" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipSuggestTasks");
    await tool.execute({
      issueId: "PAP-1135",
      idempotencyKey: "run-1:suggest",
      payload: {
        version: 1,
        tasks: [{ clientKey: "task-1", title: "One" }],
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://localhost:3100/api/issues/PAP-1135/interactions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      kind: "suggest_tasks",
      continuationPolicy: "wake_assignee",
      idempotencyKey: "run-1:suggest",
      payload: {
        version: 1,
        tasks: [{ clientKey: "task-1", title: "One" }],
      },
    });
  });

  it("creates request_confirmation interactions with plan target payloads", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "interaction-1", kind: "request_confirmation" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipRequestConfirmation");
    await tool.execute({
      issueId: "PAP-1135",
      idempotencyKey: "confirmation:PAP-1135:plan:33333333-3333-4333-8333-333333333333",
      title: "Plan approval",
      payload: {
        version: 1,
        prompt: "Accept this plan?",
        acceptLabel: "Accept plan",
        allowDeclineReason: true,
        rejectLabel: "Request changes",
        rejectRequiresReason: true,
        supersedeOnUserComment: true,
        target: {
          type: "issue_document",
          key: "plan",
          revisionId: "33333333-3333-4333-8333-333333333333",
          revisionNumber: 3,
        },
      },
    });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://localhost:3100/api/issues/PAP-1135/interactions");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      kind: "request_confirmation",
      continuationPolicy: "none",
      idempotencyKey: "confirmation:PAP-1135:plan:33333333-3333-4333-8333-333333333333",
      title: "Plan approval",
      payload: {
        version: 1,
        prompt: "Accept this plan?",
        acceptLabel: "Accept plan",
        allowDeclineReason: true,
        rejectLabel: "Request changes",
        rejectRequiresReason: true,
        supersedeOnUserComment: true,
        target: {
          type: "issue_document",
          key: "plan",
          revisionId: "33333333-3333-4333-8333-333333333333",
          revisionNumber: 3,
        },
      },
    });
  });

  it("creates approvals with the expected company-scoped payload", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "approval-1" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = getTool("paperclipCreateApproval");
    await tool.execute({
      type: "hire_agent",
      payload: { branch: "pap-1167" },
      issueIds: ["44444444-4444-4444-4444-444444444444"],
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(
      "http://localhost:3100/api/companies/11111111-1111-1111-1111-111111111111/approvals",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      type: "hire_agent",
      payload: { branch: "pap-1167" },
      issueIds: ["44444444-4444-4444-4444-444444444444"],
    });
  });

  it("rejects invalid generic request paths", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const tool = getTool("paperclipApiRequest");
    const response = await tool.execute({
      method: "GET",
      path: "issues",
    });

    expect(response.content[0]?.text).toContain("path must start with /");
  });

  it("rejects generic request paths that escape /api", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const tool = getTool("paperclipApiRequest");
    const response = await tool.execute({
      method: "GET",
      path: "/../../secret",
    });

    expect(response.content[0]?.text).toContain("must not contain '..'");
  });

  it("exposes the Office read tools when the office preset is selected", () => {
    const tools = createToolDefinitions(makeClient(), "office");
    expect(tools.map((tool) => tool.name)).toEqual([
      "integralOfficeGetApprovedPlan",
      "integralOfficeListDeliverables",
      "integralOfficeListUnmappedScope",
      "integralOfficeGetClientScope",
      "integralOfficeCreateTask",
      "integralOfficeCommentTask",
      "integralOfficeUpdateTask",
      "integralOfficeWakeAgent",
      "integralOfficeGetAgentStatus",
      "integralOfficeListActiveRuns",
    ]);
  });

  it("reads the approved plan mirror from Tracker for Office tools", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({
        approvedPlan: {
          mirrorStatus: "synced",
          planId: "apollo-red",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeGetApprovedPlan");
    if (!tool) throw new Error("Missing integralOfficeGetApprovedPlan");

    const response = await tool.execute({
      campaignId: "campaign-1",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(
      "http://tracker.local/api/internal/office/client-scope?campaignId=campaign-1",
    );
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer office-secret");
    expect(response.content[0]?.text).toContain("apollo-red");
  });

  it("aggregates Tracker scope data for integralOfficeGetClientScope", async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockJsonResponse({
      campaign: { id: "campaign-1" },
      approvedPlan: { mirrorStatus: "synced" },
      deliverables: [{ id: "del-1" }],
      unmappedServices: [],
    }));
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeGetClientScope");
    if (!tool) throw new Error("Missing integralOfficeGetClientScope");

    const response = await tool.execute({
      clientSlug: "apollo-red",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://tracker.local/api/internal/office/client-scope?clientSlug=apollo-red");
    expect(response.content[0]?.text).toContain("\"mirrorStatus\": \"synced\"");
    expect(response.content[0]?.text).toContain("\"del-1\"");
  });

  it("rejects ambiguous Tracker scope lookups for Office tools", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeGetClientScope");
    if (!tool) throw new Error("Missing integralOfficeGetClientScope");

    const response = await tool.execute({
      campaignId: "campaign-1",
      notionPageId: "page-1",
    });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.content[0]?.text).toContain("Provide exactly one");
  });

  it("creates Office tasks against the default company with audit headers", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "issue-1", identifier: "INT-500" }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeCreateTask");
    if (!tool) throw new Error("Missing integralOfficeCreateTask");

    await tool.execute({
      title: "Review approved plan handoff",
      description: "Follow the mirrored plan deliverables",
      priority: "high",
      assigneeAgentId: "22222222-2222-2222-2222-222222222222",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(
      "http://localhost:3100/api/companies/11111111-1111-1111-1111-111111111111/issues",
    );
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["X-Paperclip-Run-Id"]).toBe(
      "33333333-3333-3333-3333-333333333333",
    );
    expect(JSON.parse(String(init.body))).toEqual({
      title: "Review approved plan handoff",
      description: "Follow the mirrored plan deliverables",
      priority: "high",
      assigneeAgentId: "22222222-2222-2222-2222-222222222222",
    });
  });

  it("wakes Office agents with an explicit idempotency key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse({ id: "run-1", status: "queued" }, 202),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeWakeAgent");
    if (!tool) throw new Error("Missing integralOfficeWakeAgent");

    await tool.execute({
      agentId: "22222222-2222-2222-2222-222222222222",
      reason: "office_task_followup",
      idempotencyKey: "tracker:campaign-1:handoff:dante:followup",
      issueId: "INT-500",
      payload: {
        campaignId: "campaign-1",
      },
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe(
      "http://localhost:3100/api/agents/22222222-2222-2222-2222-222222222222/wakeup",
    );
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({
      source: "on_demand",
      triggerDetail: "manual",
      reason: "office_task_followup",
      idempotencyKey: "tracker:campaign-1:handoff:dante:followup",
      forceFreshSession: false,
      payload: {
        campaignId: "campaign-1",
        issueId: "INT-500",
      },
    });
  });

  it("lists Office live runs for one issue without company routing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      mockJsonResponse([{ id: "run-1", status: "running" }]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const tool = createToolDefinitions(makeClient(), "office")
      .find((candidate) => candidate.name === "integralOfficeListActiveRuns");
    if (!tool) throw new Error("Missing integralOfficeListActiveRuns");

    const response = await tool.execute({
      issueId: "INT-500",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(url)).toBe("http://localhost:3100/api/issues/INT-500/live-runs");
    expect(init.method).toBe("GET");
    expect((init.headers as Record<string, string>)["X-Paperclip-Run-Id"]).toBeUndefined();
    expect(response.content[0]?.text).toContain("\"run-1\"");
  });
});
