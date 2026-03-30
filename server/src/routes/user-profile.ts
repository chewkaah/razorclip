import { Router } from "express";
import { eq } from "drizzle-orm";
import type { Db } from "@paperclipai/db";
import { authUsers } from "@paperclipai/db";
import { assertBoard } from "./authz.js";
import { userProfileService } from "../services/user-profile.js";

export function userProfileRoutes(db: Db) {
  const router = Router();
  const svc = userProfileService(db);

  /**
   * GET /user/profile
   * Get current user's profile (creates default if doesn't exist)
   */
  router.get("/user/profile", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    // Look up user name for auto-populating new profiles
    const [user] = await db.select({ name: authUsers.name }).from(authUsers).where(eq(authUsers.id, userId)).limit(1);
    const profile = await svc.getOrCreate(userId, user?.name);
    res.json(profile);
  });

  /**
   * PATCH /user/profile
   * Update current user's profile (partial update)
   */
  router.patch("/user/profile", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const { contextMd, displayName, avatarUrl, timezone, preferences } = req.body;

    const updated = await svc.update(userId, {
      contextMd,
      displayName,
      avatarUrl,
      timezone,
      preferences,
    });

    res.json(updated);
  });

  /**
   * GET /user/profile/context
   * Get the USER.md content formatted for agent injection.
   * This is what agents read when they need user context.
   */
  router.get("/user/profile/context", async (req, res) => {
    assertBoard(req);
    const userId = req.actor.userId;
    if (!userId) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }
    const context = await svc.getContextMd(userId);
    res.json({ contextMd: context });
  });

  return router;
}
