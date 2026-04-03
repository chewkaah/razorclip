import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { Command } from "commander";
import {
  addIssueCommentSchema,
  checkoutIssueSchema,
  createIssueSchema,
  updateIssueSchema,
  type Issue,
  type IssueComment,
} from "@paperclipai/shared";
import {
  addCommonClientOptions,
  formatInlineRecord,
  handleCommandError,
  printOutput,
  resolveCommandContext,
  type BaseClientOptions,
  type ResolvedClientContext,
} from "./common.js";
import { ApiRequestError, ApiConnectionError } from "../../client/http.js";

interface IssueBaseOptions extends BaseClientOptions {
  status?: string;
  assigneeAgentId?: string;
  projectId?: string;
  match?: string;
}

interface IssueCreateOptions extends BaseClientOptions {
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
}

interface IssueUpdateOptions extends BaseClientOptions {
  title?: string;
  description?: string;
  status?: string;
  priority?: string;
  assigneeAgentId?: string;
  projectId?: string;
  goalId?: string;
  parentId?: string;
  requestDepth?: string;
  billingCode?: string;
  comment?: string;
  hiddenAt?: string;
}

interface IssueCommentOptions extends BaseClientOptions {
  body: string;
  reopen?: boolean;
}

interface IssueCheckoutOptions extends BaseClientOptions {
  agentId: string;
  expectedStatuses?: string;
}

export function registerIssueCommands(program: Command): void {
  const issue = program.command("issue").description("Issue operations");

  addCommonClientOptions(
    issue
      .command("list")
      .description("List issues for a company")
      .option("-C, --company-id <id>", "Company ID")
      .option("--status <csv>", "Comma-separated statuses")
      .option("--assignee-agent-id <id>", "Filter by assignee agent ID")
      .option("--project-id <id>", "Filter by project ID")
      .option("--match <text>", "Local text match on identifier/title/description")
      .action(async (opts: IssueBaseOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const params = new URLSearchParams();
          if (opts.status) params.set("status", opts.status);
          if (opts.assigneeAgentId) params.set("assigneeAgentId", opts.assigneeAgentId);
          if (opts.projectId) params.set("projectId", opts.projectId);

          const query = params.toString();
          const path = `/api/companies/${ctx.companyId}/issues${query ? `?${query}` : ""}`;
          const rows = (await ctx.api.get<Issue[]>(path)) ?? [];

          const filtered = filterIssueRows(rows, opts.match);
          if (ctx.json) {
            printOutput(filtered, { json: true });
            return;
          }

          if (filtered.length === 0) {
            printOutput([], { json: false });
            return;
          }

          for (const item of filtered) {
            console.log(
              formatInlineRecord({
                identifier: item.identifier,
                id: item.id,
                status: item.status,
                priority: item.priority,
                assigneeAgentId: item.assigneeAgentId,
                title: item.title,
                projectId: item.projectId,
              }),
            );
          }
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("get")
      .description("Get an issue by UUID or identifier (e.g. PC-12)")
      .argument("<idOrIdentifier>", "Issue ID or identifier")
      .action(async (idOrIdentifier: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const row = await ctx.api.get<Issue>(`/api/issues/${idOrIdentifier}`);
          printOutput(row, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("create")
      .description("Create an issue")
      .requiredOption("-C, --company-id <id>", "Company ID")
      .requiredOption("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .action(async (opts: IssueCreateOptions) => {
        try {
          const ctx = resolveCommandContext(opts, { requireCompany: true });
          const payload = createIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
          });

          const created = await ctx.api.post<Issue>(`/api/companies/${ctx.companyId}/issues`, payload);
          printOutput(created, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
    { includeCompany: false },
  );

  addCommonClientOptions(
    issue
      .command("update")
      .description("Update an issue")
      .argument("<issueId>", "Issue ID")
      .option("--title <title>", "Issue title")
      .option("--description <text>", "Issue description")
      .option("--status <status>", "Issue status")
      .option("--priority <priority>", "Issue priority")
      .option("--assignee-agent-id <id>", "Assignee agent ID")
      .option("--project-id <id>", "Project ID")
      .option("--goal-id <id>", "Goal ID")
      .option("--parent-id <id>", "Parent issue ID")
      .option("--request-depth <n>", "Request depth integer")
      .option("--billing-code <code>", "Billing code")
      .option("--comment <text>", "Optional comment to add with update")
      .option("--hidden-at <iso8601|null>", "Set hiddenAt timestamp or literal 'null'")
      .action(async (issueId: string, opts: IssueUpdateOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = updateIssueSchema.parse({
            title: opts.title,
            description: opts.description,
            status: opts.status,
            priority: opts.priority,
            assigneeAgentId: opts.assigneeAgentId,
            projectId: opts.projectId,
            goalId: opts.goalId,
            parentId: opts.parentId,
            requestDepth: parseOptionalInt(opts.requestDepth),
            billingCode: opts.billingCode,
            comment: opts.comment,
            hiddenAt: parseHiddenAt(opts.hiddenAt),
          });

          const updated = await ctx.api.patch<Issue & { comment?: IssueComment | null }>(`/api/issues/${issueId}`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("comment")
      .description("Add comment to issue with retry and verification")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--body <text>", "Comment body")
      .option("--reopen", "Reopen if issue is done/cancelled")
      .action(async (issueId: string, opts: IssueCommentOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = addIssueCommentSchema.parse({
            body: opts.body,
            reopen: opts.reopen,
          });
          const comment = await postCommentWithRetry(ctx, issueId, payload);
          printOutput(comment, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("checkout")
      .description("Checkout issue for an agent")
      .argument("<issueId>", "Issue ID")
      .requiredOption("--agent-id <id>", "Agent ID")
      .option(
        "--expected-statuses <csv>",
        "Expected current statuses",
        "todo,backlog,blocked",
      )
      .action(async (issueId: string, opts: IssueCheckoutOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const payload = checkoutIssueSchema.parse({
            agentId: opts.agentId,
            expectedStatuses: parseCsv(opts.expectedStatuses),
          });
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/checkout`, payload);
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );

  addCommonClientOptions(
    issue
      .command("release")
      .description("Release issue back to todo and clear assignee")
      .argument("<issueId>", "Issue ID")
      .action(async (issueId: string, opts: BaseClientOptions) => {
        try {
          const ctx = resolveCommandContext(opts);
          const updated = await ctx.api.post<Issue>(`/api/issues/${issueId}/release`, {});
          printOutput(updated, { json: ctx.json });
        } catch (err) {
          handleCommandError(err);
        }
      }),
  );
}

function parseCsv(value: string | undefined): string[] {
  if (!value) return [];
  return value.split(",").map((v) => v.trim()).filter(Boolean);
}

function parseOptionalInt(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }
  return parsed;
}

function parseHiddenAt(value: string | undefined): string | null | undefined {
  if (value === undefined) return undefined;
  if (value.trim().toLowerCase() === "null") return null;
  return value;
}

function filterIssueRows(rows: Issue[], match: string | undefined): Issue[] {
  if (!match?.trim()) return rows;
  const needle = match.trim().toLowerCase();
  return rows.filter((row) => {
    const text = [row.identifier, row.title, row.description]
      .filter((part): part is string => Boolean(part))
      .join("\n")
      .toLowerCase();
    return text.includes(needle);
  });
}

/**
 * Retry helper with exponential backoff.
 * Retries on 5xx errors and connection errors.
 * Does NOT retry on 4xx (client errors).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxRetries?: number; onRetry?: (attempt: number, error: Error) => void } = {},
): Promise<T> {
  const maxRetries = opts.maxRetries ?? 3;
  const backoffMs = [1000, 2000, 4000];

  let lastError: Error | undefined;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      // Don't retry on 4xx client errors (they won't succeed on retry)
      if (err instanceof ApiRequestError && err.status >= 400 && err.status < 500) {
        throw err;
      }

      // Retry on 5xx server errors and connection errors
      const isRetryable =
        (err instanceof ApiRequestError && err.status >= 500) ||
        err instanceof ApiConnectionError;

      if (!isRetryable || attempt >= maxRetries) {
        throw err;
      }

      // Wait before retry
      const delay = backoffMs[attempt] ?? backoffMs[backoffMs.length - 1];
      opts.onRetry?.(attempt + 1, lastError);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError ?? new Error("Unknown error in retry loop");
}

/**
 * Save failed comment to fallback file for later recovery.
 */
async function saveFailedComment(issueId: string, body: string, error: Error): Promise<string> {
  const failedCommentsDir = path.join(os.homedir(), ".paperclip", "failed-comments");
  await fs.mkdir(failedCommentsDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `${issueId}-${timestamp}.md`;
  const filepath = path.join(failedCommentsDir, filename);

  const content = [
    `# Failed Comment for ${issueId}`,
    ``,
    `**Timestamp**: ${new Date().toISOString()}`,
    `**Error**: ${error.message}`,
    ``,
    `---`,
    ``,
    body,
  ].join("\n");

  await fs.writeFile(filepath, content, "utf-8");
  return filepath;
}

/**
 * Post comment with retry, verification, and fallback.
 */
async function postCommentWithRetry(
  ctx: ResolvedClientContext,
  issueId: string,
  payload: { body: string; reopen?: boolean },
): Promise<IssueComment> {
  let comment: IssueComment | null = null;

  // Step 1: POST with retry
  try {
    comment = await withRetry(
      () => ctx.api.post<IssueComment>(`/api/issues/${issueId}/comments`, payload),
      {
        onRetry: (attempt, error) => {
          console.error(`[paperclip] Comment POST failed (attempt ${attempt}): ${error.message}. Retrying...`);
        },
      },
    );
  } catch (err) {
    // All retries failed - save to fallback file
    const error = err instanceof Error ? err : new Error(String(err));
    const fallbackPath = await saveFailedComment(issueId, payload.body, error);
    console.error(`[paperclip] Failed to post comment after retries. Saved to: ${fallbackPath}`);
    throw err;
  }

  if (!comment?.id) {
    const error = new Error("Comment POST succeeded but returned no ID");
    const fallbackPath = await saveFailedComment(issueId, payload.body, error);
    console.error(`[paperclip] Comment POST returned no ID. Saved to: ${fallbackPath}`);
    throw error;
  }

  // Step 2: Verify with GET
  try {
    const verified = await withRetry(
      () => ctx.api.get<IssueComment>(`/api/issues/${issueId}/comments/${comment!.id}`),
      {
        maxRetries: 2,
        onRetry: (attempt, error) => {
          console.error(`[paperclip] Comment verification failed (attempt ${attempt}): ${error.message}. Retrying...`);
        },
      },
    );

    if (!verified) {
      console.error(`[paperclip] Warning: Comment ${comment.id} could not be verified but POST succeeded.`);
    }
  } catch (verifyErr) {
    // Verification failed but POST succeeded - log warning but don't fail
    console.error(`[paperclip] Warning: Could not verify comment ${comment.id}: ${verifyErr instanceof Error ? verifyErr.message : String(verifyErr)}`);
  }

  return comment;
}
