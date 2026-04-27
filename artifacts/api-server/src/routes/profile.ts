import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { companiesTable, usersTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { hashPassword, signToken, verifyPassword } from "../lib/auth";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const UpdateProfileBody = z.object({
  name: z.string().trim().min(2, "Name is too short").max(255, "Name is too long").nullable(),
});

const UpdateEmailBody = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  currentPassword: z.string().min(1, "Current password is required"),
});

const UpdatePasswordBody = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

async function getProfileByUserId(userId: string) {
  const [row] = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      passwordHash: usersTable.passwordHash,
      role: usersTable.role,
      companyId: usersTable.companyId,
      companyName: companiesTable.name,
      createdAt: usersTable.createdAt,
      updatedAt: usersTable.updatedAt,
    })
    .from(usersTable)
    .leftJoin(companiesTable, eq(usersTable.companyId, companiesTable.id))
    .where(eq(usersTable.id, userId))
    .limit(1);

  return row;
}

function publicProfile(row: Awaited<ReturnType<typeof getProfileByUserId>>) {
  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    companyId: row.companyId,
    companyName: row.companyName,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/profile", requireAuth, async (req: Request, res: Response) => {
  const userId = req.principal!.id;
  const row = await getProfileByUserId(userId);

  if (!row) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  res.json({ profile: publicProfile(row) });
});

router.patch("/profile", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateProfileBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid profile payload" });
    return;
  }

  const userId = req.principal!.id;

  await db
    .update(usersTable)
    .set({
      name: parsed.data.name,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  const row = await getProfileByUserId(userId);

  res.json({ profile: publicProfile(row) });
});

router.patch("/profile/email", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdateEmailBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid email payload" });
    return;
  }

  const userId = req.principal!.id;
  const nextEmail = parsed.data.email.toLowerCase();

  const row = await getProfileByUserId(userId);

  if (!row) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const passwordOk = await verifyPassword(parsed.data.currentPassword, row.passwordHash);

  if (!passwordOk) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const [existingEmailOwner] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, nextEmail))
    .limit(1);

  if (existingEmailOwner && existingEmailOwner.id !== userId) {
    res.status(409).json({ error: "This email is already used" });
    return;
  }

  await db
    .update(usersTable)
    .set({
      email: nextEmail,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  const updated = await getProfileByUserId(userId);

  if (!updated) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const token = signToken({
    sub: updated.id,
    email: updated.email,
    role: updated.role,
    companyId: updated.companyId,
  });

  res.json({
    token,
    principal: {
      id: updated.id,
      email: updated.email,
      role: updated.role,
      companyId: updated.companyId,
      companyName: updated.companyName,
    },
    profile: publicProfile(updated),
  });
});

router.patch("/profile/password", requireAuth, async (req: Request, res: Response) => {
  const parsed = UpdatePasswordBody.safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid password payload" });
    return;
  }

  const userId = req.principal!.id;
  const row = await getProfileByUserId(userId);

  if (!row) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const passwordOk = await verifyPassword(parsed.data.currentPassword, row.passwordHash);

  if (!passwordOk) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const nextHash = await hashPassword(parsed.data.newPassword);

  await db
    .update(usersTable)
    .set({
      passwordHash: nextHash,
      updatedAt: new Date(),
    })
    .where(eq(usersTable.id, userId));

  res.json({ ok: true });
});

export default router;