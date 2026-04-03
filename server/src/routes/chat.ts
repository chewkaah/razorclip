import { Router } from "express";
import type { Db } from "@paperclipai/db";
import { chatService } from "../services/chat.js";
import { assertCompanyAccess } from "./authz.js";
import { notFound } from "../errors.js";

export function chatRoutes(db: Db) {
  const router = Router();
  const svc = chatService(db);

  // List threads for a company
  router.get("/companies/:companyId/chat/threads", async (req, res) => {
    const { companyId } = req.params;
    assertCompanyAccess(req, companyId!);
    const threads = await svc.listThreads(companyId!, req.actor?.userId ?? null);
    res.json(threads);
  });

  // Create a new thread
  router.post("/companies/:companyId/chat/threads", async (req, res) => {
    const { companyId } = req.params;
    assertCompanyAccess(req, companyId!);
    const { adapterType, model } = req.body;
    const thread = await svc.createThread({
      companyId: companyId!,
      userId: req.actor?.userId ?? null,
      adapterType: adapterType ?? "claude_local",
      model,
    });
    res.status(201).json(thread);
  });

  // Get a single thread
  router.get("/chat/threads/:threadId", async (req, res) => {
    const thread = await svc.getThread(req.params.threadId!);
    if (!thread) throw notFound("Thread not found");
    assertCompanyAccess(req, thread.companyId);
    res.json(thread);
  });

  // Update a thread
  router.patch("/chat/threads/:threadId", async (req, res) => {
    const existing = await svc.getThread(req.params.threadId!);
    if (!existing) throw notFound("Thread not found");
    assertCompanyAccess(req, existing.companyId);
    const { title, adapterType, model, adapterConfig } = req.body;
    const thread = await svc.updateThread(req.params.threadId!, { title, adapterType, model, adapterConfig });
    res.json(thread);
  });

  // Delete a thread
  router.delete("/chat/threads/:threadId", async (req, res) => {
    const existing = await svc.getThread(req.params.threadId!);
    if (!existing) throw notFound("Thread not found");
    assertCompanyAccess(req, existing.companyId);
    await svc.deleteThread(req.params.threadId!);
    res.status(204).end();
  });

  // List messages in a thread
  router.get("/chat/threads/:threadId/messages", async (req, res) => {
    const thread = await svc.getThread(req.params.threadId!);
    if (!thread) throw notFound("Thread not found");
    assertCompanyAccess(req, thread.companyId);
    const messages = await svc.listMessages(req.params.threadId!);
    res.json(messages);
  });

  // Send a message (triggers agent run)
  router.post("/chat/threads/:threadId/messages", async (req, res) => {
    const thread = await svc.getThread(req.params.threadId!);
    if (!thread) throw notFound("Thread not found");
    assertCompanyAccess(req, thread.companyId);
    const { content, agentId } = req.body;
    const result = await svc.sendMessage({
      threadId: req.params.threadId!,
      companyId: thread.companyId,
      actorId: req.actor?.userId ?? req.actor?.agentId ?? "anonymous",
      content,
      agentId: agentId ?? undefined,
    });
    res.status(201).json(result);
  });

  return router;
}
