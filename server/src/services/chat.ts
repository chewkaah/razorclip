import { eq, desc, asc, and } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { chatThreads, chatMessages, agents } from "@paperclipai/db";
import { heartbeatService } from "./heartbeat.js";
import { notFound, conflict } from "../errors.js";

function toThread(row: typeof chatThreads.$inferSelect) {
  return {
    id: row.id,
    companyId: row.companyId,
    userId: row.userId,
    title: row.title,
    adapterType: row.adapterType,
    adapterConfig: (row.adapterConfig ?? {}) as Record<string, unknown>,
    model: row.model,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function toMessage(row: typeof chatMessages.$inferSelect) {
  return {
    id: row.id,
    threadId: row.threadId,
    companyId: row.companyId,
    role: row.role as "user" | "assistant",
    content: row.content,
    runId: row.runId,
    isStreaming: row.isStreaming,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export function chatService(db: Db) {
  const heartbeat = heartbeatService(db);

  async function listThreads(companyId: string, userId: string | null) {
    const rows = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.companyId, companyId))
      .orderBy(desc(chatThreads.updatedAt));
    return rows.map(toThread);
  }

  async function getThread(threadId: string) {
    const row = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .then((rows) => rows[0] ?? null);
    return row ? toThread(row) : null;
  }

  async function createThread(input: {
    companyId: string;
    userId: string | null;
    adapterType: string;
    model?: string;
  }) {
    const [row] = await db
      .insert(chatThreads)
      .values({
        companyId: input.companyId,
        userId: input.userId,
        adapterType: input.adapterType,
        model: input.model ?? null,
      })
      .returning();
    return toThread(row!);
  }

  async function updateThread(
    threadId: string,
    patch: { title?: string; adapterType?: string; model?: string; adapterConfig?: Record<string, unknown> },
  ) {
    // Build the set object, merging adapterConfig if provided
    const setValues: Record<string, unknown> = { updatedAt: new Date() };
    if (patch.title !== undefined) setValues.title = patch.title;
    if (patch.adapterType !== undefined) setValues.adapterType = patch.adapterType;
    if (patch.model !== undefined) setValues.model = patch.model;
    if (patch.adapterConfig !== undefined) {
      // Merge with existing config so we don't clobber other fields
      const existing = await db
        .select()
        .from(chatThreads)
        .where(eq(chatThreads.id, threadId))
        .then((rows) => rows[0] ?? null);
      const existingConfig = (existing?.adapterConfig ?? {}) as Record<string, unknown>;
      setValues.adapterConfig = { ...existingConfig, ...patch.adapterConfig };
    }
    const [row] = await db
      .update(chatThreads)
      .set(setValues)
      .where(eq(chatThreads.id, threadId))
      .returning();
    if (!row) throw notFound("Thread not found");
    return toThread(row);
  }

  async function deleteThread(threadId: string) {
    const deleted = await db
      .delete(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .returning();
    if (deleted.length === 0) throw notFound("Thread not found");
  }

  async function listMessages(threadId: string) {
    const rows = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.threadId, threadId))
      .orderBy(asc(chatMessages.createdAt));
    return rows.map(toMessage);
  }

  async function getOrCreateChatAgent(
    companyId: string,
    threadId: string,
    adapterType: string,
  ): Promise<string> {
    // Look for an existing chat agent for this thread stored in adapter config
    const thread = await db
      .select()
      .from(chatThreads)
      .where(eq(chatThreads.id, threadId))
      .then((rows) => rows[0] ?? null);
    if (!thread) throw notFound("Thread not found");

    const config = (thread.adapterConfig ?? {}) as Record<string, unknown>;
    if (config.chatAgentId) {
      // Verify agent still exists
      const existing = await db
        .select()
        .from(agents)
        .where(eq(agents.id, config.chatAgentId as string))
        .then((rows) => rows[0] ?? null);
      if (existing) return existing.id;
    }

    // Create a dedicated chat agent
    const shortId = threadId.slice(0, 8);
    const [agent] = await db
      .insert(agents)
      .values({
        companyId,
        name: `[Chat] ${shortId}`,
        role: "general",
        status: "active",
        adapterType,
        adapterConfig: {},
        runtimeConfig: {},
        permissions: {},
      })
      .returning();

    // Store the agent ID in thread config
    await db
      .update(chatThreads)
      .set({
        adapterConfig: { ...config, chatAgentId: agent!.id },
        updatedAt: new Date(),
      })
      .where(eq(chatThreads.id, threadId));

    return agent!.id;
  }

  async function sendMessage(input: {
    threadId: string;
    companyId: string;
    actorId: string;
    content: string;
    agentId?: string;
  }) {
    const thread = await getThread(input.threadId);
    if (!thread) throw notFound("Thread not found");

    // Check no active streaming message
    const streaming = await db
      .select()
      .from(chatMessages)
      .where(
        and(
          eq(chatMessages.threadId, input.threadId),
          eq(chatMessages.isStreaming, true),
        ),
      )
      .then((rows) => rows[0] ?? null);
    if (streaming) throw conflict("A response is already in progress for this thread");

    // Insert user message
    const [userMsg] = await db
      .insert(chatMessages)
      .values({
        threadId: input.threadId,
        companyId: input.companyId,
        role: "user",
        content: input.content,
      })
      .returning();

    // Insert placeholder assistant message
    const [assistantMsg] = await db
      .insert(chatMessages)
      .values({
        threadId: input.threadId,
        companyId: input.companyId,
        role: "assistant",
        content: "",
        isStreaming: true,
      })
      .returning();

    // Build conversation context from history
    const history = await listMessages(input.threadId);
    const contextLines = history
      .filter((m) => m.id !== assistantMsg!.id)
      .map((m) => `[${m.role === "user" ? "User" : "Assistant"}]: ${m.content}`)
      .join("\n\n");

    // Use explicit agentId if provided, otherwise get or create the thread's default chat agent
    const agentId = input.agentId
      ? input.agentId
      : await getOrCreateChatAgent(
          input.companyId,
          input.threadId,
          thread.adapterType,
        );

    // Enqueue a heartbeat run
    const result = await heartbeat.wakeup(agentId, {
      source: "on_demand",
      triggerDetail: "manual",
      reason: contextLines,
      requestedByActorType: "user",
      requestedByActorId: input.actorId,
      contextSnapshot: {
        chatThreadId: input.threadId,
        chatMessageId: assistantMsg!.id,
        invocationSource: "chat",
      },
    });

    const runId =
      result && typeof result === "object" && "run" in result && result.run
        ? (result.run as { id: string }).id
        : null;

    // Update assistant message with run ID
    if (runId) {
      await db
        .update(chatMessages)
        .set({ runId, updatedAt: new Date() })
        .where(eq(chatMessages.id, assistantMsg!.id));
    }

    // Auto-title on first message
    if (thread.title === "New Thread") {
      const title = input.content.slice(0, 60) + (input.content.length > 60 ? "..." : "");
      await db
        .update(chatThreads)
        .set({ title, updatedAt: new Date() })
        .where(eq(chatThreads.id, input.threadId));
    }

    // Touch thread updatedAt
    await db
      .update(chatThreads)
      .set({ updatedAt: new Date() })
      .where(eq(chatThreads.id, input.threadId));

    return {
      userMessage: toMessage(userMsg!),
      assistantMessage: toMessage(assistantMsg!),
      runId: runId ?? assistantMsg!.id,
    };
  }

  async function finalizeAssistantMessage(
    runId: string,
    finalContent: string,
    error?: string,
  ) {
    await db
      .update(chatMessages)
      .set({
        content: finalContent,
        isStreaming: false,
        error: error ?? null,
        updatedAt: new Date(),
      })
      .where(eq(chatMessages.runId, runId));
  }

  return {
    listThreads,
    getThread,
    createThread,
    updateThread,
    deleteThread,
    listMessages,
    sendMessage,
    finalizeAssistantMessage,
  };
}
