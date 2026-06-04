import express from "express";
import request from "supertest";
import { beforeEach, describe, expect, it, vi } from "vitest";

const companyId = "11111111-1111-4111-8111-111111111111";
const rexAgentId = "22222222-2222-4222-8222-222222222222";
const novaAgentId = "33333333-3333-4333-8333-333333333333";

const mockIssueService = vi.hoisted(() => ({
  create: vi.fn(),
}));

const mockAccessService = vi.hoisted(() => ({
  canUser: vi.fn(),
  hasPermission: vi.fn(),
}));

const mockAgentService = vi.hoisted(() => ({
  getById: vi.fn(),
  list: vi.fn(),
  resolveByReference: vi.fn(),
}));

const mockHeartbeatService = vi.hoisted(() => ({
  wakeup: vi.fn(async () => undefined),
  reportRunActivity: vi.fn(async () => undefined),
  getRun: vi.fn(async () => null),
  getActiveRunForAgent: vi.fn(async () => null),
  cancelRun: vi.fn(async () => null),
}));

const mockLogActivity = vi.hoisted(() => vi.fn(async () => undefined));

vi.mock("@paperclipai/shared/telemetry", () => ({
  trackAgentTaskCompleted: vi.fn(),
  trackErrorHandlerCrash: vi.fn(),
}));

vi.mock("../telemetry.js", () => ({
  getTelemetryClient: vi.fn(() => ({ track: vi.fn() })),
}));

vi.mock("../services/access.js", () => ({
  accessService: () => mockAccessService,
}));

vi.mock("../services/activity-log.js", () => ({
  logActivity: mockLogActivity,
}));

vi.mock("../services/agents.js", () => ({
  agentService: () => mockAgentService,
}));

vi.mock("../services/heartbeat.js", () => ({
  heartbeatService: () => mockHeartbeatService,
}));

vi.mock("../services/issues.js", () => ({
  issueService: () => mockIssueService,
}));

vi.mock("../services/index.js", () => ({
  accessService: () => mockAccessService,
  agentService: () => mockAgentService,
  documentService: () => ({}),
  executionWorkspaceService: () => ({}),
  feedbackService: () => ({
    listIssueVotesForUser: vi.fn(async () => []),
    saveIssueVote: vi.fn(async () => ({ vote: null, consentEnabledNow: false, sharingEnabled: false })),
  }),
  goalService: () => ({}),
  heartbeatService: () => mockHeartbeatService,
  instanceSettingsService: () => ({
    get: vi.fn(async () => ({
      id: "instance-settings-1",
      general: {
        censorUsernameInLogs: false,
        feedbackDataSharingPreference: "prompt",
      },
    })),
    listCompanyIds: vi.fn(async () => [companyId]),
  }),
  issueApprovalService: () => ({}),
  issueReferenceService: () => ({
    diffIssueReferenceSummary: () => ({
      addedReferencedIssues: [],
      removedReferencedIssues: [],
      currentReferencedIssues: [],
    }),
    emptySummary: () => ({ outbound: [], inbound: [] }),
    listIssueReferenceSummary: async () => ({ outbound: [], inbound: [] }),
    syncIssue: async () => undefined,
  }),
  issueService: () => mockIssueService,
  issueThreadInteractionService: () => ({
    expireRequestConfirmationsSupersededByComment: vi.fn(async () => []),
    expireStaleRequestConfirmationsForIssueDocument: vi.fn(async () => []),
  }),
  issueTreeControlService: () => ({
    getActivePauseHoldGate: vi.fn(async () => null),
  }),
  logActivity: mockLogActivity,
  projectService: () => ({}),
  routineService: () => ({
    syncRunStatusForIssue: vi.fn(async () => undefined),
  }),
  workProductService: () => ({}),
}));

async function createApp() {
  const [{ issueRoutes }, { errorHandler }] = await Promise.all([
    import("../routes/issues.js"),
    import("../middleware/index.js"),
  ]);
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    (req as any).actor = {
      type: "agent",
      agentId: rexAgentId,
      companyId,
      source: "agent_key",
      runId: "run-1",
    };
    next();
  });
  app.use("/api", issueRoutes({} as any, {} as any));
  app.use(errorHandler);
  return app;
}

function makeIssue(overrides: Record<string, unknown> = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    companyId,
    identifier: "INT-3847",
    title: "Test issue",
    status: "todo",
    assigneeAgentId: novaAgentId,
    assigneeUserId: null,
    ...overrides,
  };
}

describe.sequential("Rex route assignment policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAccessService.hasPermission.mockResolvedValue(true);
    mockAgentService.getById.mockImplementation(async (id: string) => {
      if (id === rexAgentId) return { id, companyId, name: "Rex", role: "devops", permissions: {} };
      if (id === novaAgentId) return { id, companyId, name: "Nova", role: "designer", permissions: {} };
      return null;
    });
    mockIssueService.create.mockResolvedValue(makeIssue());
    mockHeartbeatService.wakeup.mockResolvedValue(undefined);
    mockLogActivity.mockResolvedValue(undefined);
  });

  it("rejects Rex assigning deck delivery tracking to Nova", async () => {
    const app = await createApp();

    const res = await request(app)
      .post(`/api/companies/${companyId}/issues`)
      .send({
        title: "Share the link to the deck stage once it's ready",
        description: "Pfizer AI Implementation follow-up",
        status: "todo",
        priority: "medium",
        assigneeAgentId: novaAgentId,
      });

    expect(res.status).toBe(422);
    expect(res.body.error).toBe("Rex cannot assign deck/proposal tracking work to Nova");
    expect(res.body.details).toMatchObject({
      reason: "deck_proposal_tracking_belongs_to_brent",
      recommendedAssigneeAgent: "Brent",
    });
    expect(mockIssueService.create).not.toHaveBeenCalled();
  });

  it("allows Rex assigning explicit creative production to Nova", async () => {
    const app = await createApp();

    const res = await request(app)
      .post(`/api/companies/${companyId}/issues`)
      .send({
        title: "Create motion graphic for Pfizer deck launch",
        description: "Video asset for the presentation launch.",
        status: "todo",
        priority: "medium",
        assigneeAgentId: novaAgentId,
      });

    expect(res.status).toBe(201);
    expect(mockIssueService.create).toHaveBeenCalled();
  });
});
