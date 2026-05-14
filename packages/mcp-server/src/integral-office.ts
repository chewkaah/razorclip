import { z } from "zod";
import { PaperclipApiClient } from "./client.js";
import { formatErrorResponse, formatTextResponse } from "./format.js";
import type { ToolDefinition } from "./tools.js";

export interface TrackerApiClientConfig {
  apiUrl: string;
  apiKey: string;
}

export class TrackerApiClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  constructor(config: TrackerApiClientConfig) {
    this.apiUrl = config.apiUrl.replace(/\/+$/, "");
    this.apiKey = config.apiKey;
  }

  async requestJson<T>(path: string): Promise<T> {
    if (!path.startsWith("/")) throw new Error(`Tracker path must start with "/": ${path}`);
    const response = await fetch(`${this.apiUrl}${path}`, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        Accept: "application/json",
      },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(`Tracker ${path} failed with ${response.status}: ${body?.error ?? "unknown error"}`);
    }
    return body as T;
  }

  async getClientScope(input: {
    campaignId?: string | null;
    clientSlug?: string | null;
    notionPageId?: string | null;
  }): Promise<unknown> {
    const params = new URLSearchParams();
    if (input.campaignId) params.set("campaignId", input.campaignId);
    if (input.clientSlug) params.set("clientSlug", input.clientSlug);
    if (input.notionPageId) params.set("notionPageId", input.notionPageId);
    return this.requestJson(`/api/internal/office/client-scope?${params}`);
  }
}

export interface IntegralOfficeToolOptions {
  paperclip: PaperclipApiClient;
  tracker: TrackerApiClient;
  audit?: (event: Record<string, unknown>) => void;
}

function makeTool<TSchema extends z.ZodRawShape>(
  name: string,
  description: string,
  schema: z.ZodObject<TSchema>,
  execute: (input: z.infer<typeof schema>) => Promise<unknown>,
): ToolDefinition {
  return {
    name,
    description,
    schema,
    execute: async (input) => {
      try {
        const parsed = schema.parse(input);
        return formatTextResponse(await execute(parsed));
      } catch (error) {
        return formatErrorResponse(error);
      }
    },
  };
}

const scopeLookupSchema = z.object({
  campaignId: z.string().min(1).optional(),
  clientSlug: z.string().min(1).optional(),
  notionPageId: z.string().min(1).optional(),
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeAgentId: z.string().uuid().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

const updateTaskSchema = z.object({
  issueId: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  assigneeAgentId: z.string().uuid().nullable().optional(),
  idempotencyKey: z.string().min(1).optional(),
});

const commentTaskSchema = z.object({
  issueId: z.string().min(1),
  body: z.string().min(1),
  idempotencyKey: z.string().min(1).optional(),
});

const agentIdSchema = z.object({ agentId: z.string().uuid() });

function withIdempotency(body: string | undefined, idempotencyKey: string | undefined): string | null {
  const parts = [body?.trim() || null, idempotencyKey ? `Idempotency: ${idempotencyKey}` : null].filter(Boolean);
  return parts.length > 0 ? parts.join("\n\n") : null;
}

export function createIntegralOfficeToolDefinitions(options: IntegralOfficeToolOptions): ToolDefinition[] {
  const { paperclip, tracker, audit } = options;
  const log = (event: Record<string, unknown>) => audit?.({ at: new Date().toISOString(), ...event });

  return [
    makeTool(
      "integralOfficeGetClientScope",
      "Fetch Tracker client/campaign scope, approved plan, deliverables, action items, unmapped scope, and workstream summaries.",
      scopeLookupSchema,
      async (input) => tracker.getClientScope(input),
    ),
    makeTool(
      "integralOfficeGetApprovedPlan",
      "Fetch the approved plan/proposal scope for a Tracker campaign or client.",
      scopeLookupSchema,
      async (input) => {
        const scope = await tracker.getClientScope(input) as { approvedPlan?: unknown };
        return scope.approvedPlan ?? null;
      },
    ),
    makeTool(
      "integralOfficeListDeliverables",
      "List Tracker deliverables for a campaign or client scope.",
      scopeLookupSchema,
      async (input) => {
        const scope = await tracker.getClientScope(input) as { deliverables?: unknown[] };
        return scope.deliverables ?? [];
      },
    ),
    makeTool(
      "integralOfficeListUnmappedScope",
      "List promised services or deliverables that still need mapping.",
      scopeLookupSchema,
      async (input) => {
        const scope = await tracker.getClientScope(input) as { unmappedScope?: unknown[] };
        return scope.unmappedScope ?? [];
      },
    ),
    makeTool(
      "integralOfficeCreateTask",
      "Create an operational Paperclip task from Notion/Tracker context.",
      createTaskSchema,
      async ({ idempotencyKey, ...input }) => {
        const body = {
          ...input,
          description: withIdempotency(input.description, idempotencyKey),
          status: input.status ?? "todo",
          priority: input.priority ?? "medium",
        };
        const result = await paperclip.requestJson("POST", `/companies/${paperclip.resolveCompanyId()}/issues`, { body });
        log({ tool: "integralOfficeCreateTask", idempotencyKey, title: input.title, result });
        return result;
      },
    ),
    makeTool(
      "integralOfficeCommentTask",
      "Add an operational comment to a Paperclip task.",
      commentTaskSchema,
      async ({ issueId, body, idempotencyKey }) => {
        const result = await paperclip.requestJson("POST", `/issues/${encodeURIComponent(issueId)}/comments`, {
          body: { body: withIdempotency(body, idempotencyKey) ?? body },
        });
        log({ tool: "integralOfficeCommentTask", issueId, idempotencyKey, result });
        return result;
      },
    ),
    makeTool(
      "integralOfficeUpdateTask",
      "Update a Paperclip task status, owner, title, priority, or description.",
      updateTaskSchema,
      async ({ issueId, idempotencyKey, ...input }) => {
        const result = await paperclip.requestJson("PATCH", `/issues/${encodeURIComponent(issueId)}`, {
          body: {
            ...input,
            description: input.description === undefined ? undefined : withIdempotency(input.description, idempotencyKey),
          },
        });
        log({ tool: "integralOfficeUpdateTask", issueId, idempotencyKey, result });
        return result;
      },
    ),
    makeTool(
      "integralOfficeWakeAgent",
      "Wake a Paperclip agent for a safe operational task.",
      agentIdSchema.extend({
        issueId: z.string().min(1).optional(),
        reason: z.string().min(1).optional(),
        idempotencyKey: z.string().min(1).optional(),
      }),
      async ({ agentId, idempotencyKey, ...body }) => {
        const result = await paperclip.requestJson("POST", `/agents/${encodeURIComponent(agentId)}/wakeup`, { body });
        log({ tool: "integralOfficeWakeAgent", agentId, idempotencyKey, result });
        return result;
      },
    ),
    makeTool(
      "integralOfficeGetAgentStatus",
      "Get Paperclip agent status and configuration summary.",
      agentIdSchema,
      async ({ agentId }) => paperclip.requestJson("GET", `/agents/${encodeURIComponent(agentId)}`),
    ),
    makeTool(
      "integralOfficeListActiveRuns",
      "List queued/running Paperclip heartbeat runs for the default company.",
      z.object({}),
      async () => paperclip.requestJson("GET", `/companies/${paperclip.resolveCompanyId()}/heartbeat-runs?active=true`),
    ),
  ];
}

