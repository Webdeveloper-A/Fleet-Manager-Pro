import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, asc, desc, eq, or, isNull, lte, gte } from "drizzle-orm";
import { db } from "@workspace/db";
import { adsTable } from "@workspace/db/schema";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const placementSchema = z.enum(["dashboard", "ads-page", "all"]);

const adSchema = z.object({
  title: z.string().trim().min(1).max(255),
  description: z.string().trim().max(5000).optional().nullable(),
  imageUrl: z.string().trim().min(1),
  targetUrl: z.string().trim().optional().nullable(),
  placement: placementSchema.default("ads-page"),
  isActive: z.boolean().default(true),
  startsAt: z.string().optional().nullable(),
  endsAt: z.string().optional().nullable(),
  sortOrder: z.number().int().default(0),
});

function parseOptionalDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return date;
}

function mapAd(row: typeof adsTable.$inferSelect) {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    imageUrl: row.imageUrl,
    targetUrl: row.targetUrl,
    placement: row.placement,
    isActive: row.isActive,
    startsAt: row.startsAt,
    endsAt: row.endsAt,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/ads", requireAuth, async (req: Request, res: Response) => {
  try {
    const placement = String(req.query.placement ?? "").trim();
    const now = new Date();

    const filters = [
      eq(adsTable.isActive, true),
      or(isNull(adsTable.startsAt), lte(adsTable.startsAt, now))!,
      or(isNull(adsTable.endsAt), gte(adsTable.endsAt, now))!,
    ];

    if (placement && placement !== "all") {
      filters.push(or(eq(adsTable.placement, placement), eq(adsTable.placement, "all"))!);
    }

    const rows = await db
      .select()
      .from(adsTable)
      .where(and(...filters))
      .orderBy(asc(adsTable.sortOrder), desc(adsTable.createdAt));

    res.json(rows.map(mapAd));
  } catch (err) {
    console.error("[ads] public list failed", err);
    res.status(500).json({ error: "Reklamalarni yuklab bo‘lmadi" });
  }
});

router.get("/ads/admin", requireAuth, requireAdmin, async (_req: Request, res: Response) => {
  try {
    const rows = await db
      .select()
      .from(adsTable)
      .orderBy(asc(adsTable.sortOrder), desc(adsTable.createdAt));

    res.json(rows.map(mapAd));
  } catch (err) {
    console.error("[ads] admin list failed", err);
    res.status(500).json({ error: "Reklamalarni yuklab bo‘lmadi" });
  }
});

router.post("/ads", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = adSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Reklama ma’lumotlari noto‘g‘ri" });
      return;
    }

    const now = new Date();

    const [created] = await db
      .insert(adsTable)
      .values({
        title: parsed.data.title,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl,
        targetUrl: parsed.data.targetUrl || null,
        placement: parsed.data.placement,
        isActive: parsed.data.isActive,
        startsAt: parseOptionalDate(parsed.data.startsAt),
        endsAt: parseOptionalDate(parsed.data.endsAt),
        sortOrder: parsed.data.sortOrder,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    res.status(201).json(mapAd(created));
  } catch (err) {
    console.error("[ads] create failed", err);
    res.status(500).json({ error: "Reklama yaratib bo‘lmadi" });
  }
});

router.put("/ads/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const parsed = adSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Reklama ma’lumotlari noto‘g‘ri" });
      return;
    }

    const [updated] = await db
      .update(adsTable)
      .set({
        title: parsed.data.title,
        description: parsed.data.description || null,
        imageUrl: parsed.data.imageUrl,
        targetUrl: parsed.data.targetUrl || null,
        placement: parsed.data.placement,
        isActive: parsed.data.isActive,
        startsAt: parseOptionalDate(parsed.data.startsAt),
        endsAt: parseOptionalDate(parsed.data.endsAt),
        sortOrder: parsed.data.sortOrder,
        updatedAt: new Date(),
      })
      .where(eq(adsTable.id, req.params.id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Reklama topilmadi" });
      return;
    }

    res.json(mapAd(updated));
  } catch (err) {
    console.error("[ads] update failed", err);
    res.status(500).json({ error: "Reklama yangilab bo‘lmadi" });
  }
});

router.delete("/ads/:id", requireAuth, requireAdmin, async (req: Request, res: Response) => {
  try {
    const [deleted] = await db
      .delete(adsTable)
      .where(eq(adsTable.id, req.params.id))
      .returning({ id: adsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Reklama topilmadi" });
      return;
    }

    res.status(204).send();
  } catch (err) {
    console.error("[ads] delete failed", err);
    res.status(500).json({ error: "Reklama o‘chirib bo‘lmadi" });
  }
});

export default router;