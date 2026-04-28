import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@workspace/db";
import { dazvolsTable, vehiclesTable } from "@workspace/db/schema";
import { requireAuth, requireCompany } from "../middlewares/auth";

const router: IRouter = Router();

const statusSchema = z.enum(["active", "used", "expired"]);
const permitTypeSchema = z.enum(["bilateral", "transit", "third_country", "special"]);

const createSchema = z.object({
  vehicleId: z.string().uuid().optional().nullable(),
  permitNumber: z.string().trim().min(1).max(128),
  country: z.string().trim().min(1).max(128),
  permitType: permitTypeSchema.optional().default("bilateral"),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  status: statusSchema.optional().default("active"),
  note: z.string().trim().max(5000).optional(),
});

const updateSchema = createSchema.partial();

function parseDate(value?: string | null) {
  if (!value) return null;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }

  return date;
}

async function assertVehicleBelongsToCompany(vehicleId: string, companyId: string) {
  const [vehicle] = await db
    .select({ id: vehiclesTable.id })
    .from(vehiclesTable)
    .where(and(eq(vehiclesTable.id, vehicleId), eq(vehiclesTable.companyId, companyId)))
    .limit(1);

  return Boolean(vehicle);
}

function mapRow(row: {
  id: string;
  companyId: string;
  vehicleId: string;
  vehicleName: string | null;
  vehiclePlateNumber: string | null;
  permitNumber: string;
  country: string;
  permitType: string;
  issueDate: Date | null;
  expiryDate: Date | null;
  status: string;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: row.id,
    companyId: row.companyId,
    vehicleId: row.vehicleId,
    vehicleName: row.vehicleName,
    vehiclePlateNumber: row.vehiclePlateNumber,
    permitNumber: row.permitNumber,
    country: row.country,
    permitType: row.permitType,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    status: row.status,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/dazvols", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const companyId = req.principal!.companyId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const vehicleId = String(req.query.vehicleId ?? "").trim();

    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const filters = [eq(dazvolsTable.companyId, companyId)];

    if (status && status !== "all") {
      filters.push(eq(dazvolsTable.status, status));
    }

    if (vehicleId && vehicleId !== "all") {
      filters.push(eq(dazvolsTable.vehicleId, vehicleId));
    }

    if (search) {
      filters.push(
        or(
          ilike(dazvolsTable.permitNumber, `%${search}%`),
          ilike(dazvolsTable.country, `%${search}%`),
          ilike(dazvolsTable.permitType, `%${search}%`),
          ilike(vehiclesTable.name, `%${search}%`),
          ilike(vehiclesTable.plateNumber, `%${search}%`),
        )!,
      );
    }

    const where = and(...filters);

    const rows = await db
      .select({
        id: dazvolsTable.id,
        companyId: dazvolsTable.companyId,
        vehicleId: dazvolsTable.vehicleId,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
        permitNumber: dazvolsTable.permitNumber,
        country: dazvolsTable.country,
        permitType: dazvolsTable.permitType,
        issueDate: dazvolsTable.issueDate,
        expiryDate: dazvolsTable.expiryDate,
        status: dazvolsTable.status,
        note: dazvolsTable.note,
        createdAt: dazvolsTable.createdAt,
        updatedAt: dazvolsTable.updatedAt,
      })
      .from(dazvolsTable)
      .leftJoin(vehiclesTable, eq(dazvolsTable.vehicleId, vehiclesTable.id))
      .where(where)
      .orderBy(desc(dazvolsTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(dazvolsTable)
      .leftJoin(vehiclesTable, eq(dazvolsTable.vehicleId, vehiclesTable.id))
      .where(where);

    res.json({
      items: rows.map(mapRow),
      total: countRow?.count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[dazvols] list failed", err);
    res.status(500).json({ error: "Dazvollar ro‘yxatini yuklab bo‘lmadi" });
  }
});

router.post("/dazvols", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dazvol ma’lumotlari noto‘g‘ri" });
      return;
    }

    const companyId = req.principal!.companyId!;
    if (parsed.data.vehicleId) {
  const vehicleOk = await assertVehicleBelongsToCompany(parsed.data.vehicleId, companyId);

  if (!vehicleOk) {
    res.status(400).json({ error: "Transport topilmadi yoki kompaniyaga tegishli emas" });
    return;
  }
}
    const now = new Date();

    const [created] = await db
      .insert(dazvolsTable)
      .values({
        companyId,
        vehicleId: parsed.data.vehicleId || null,
        permitNumber: parsed.data.permitNumber,
        country: parsed.data.country,
        permitType: parsed.data.permitType,
        issueDate: parseDate(parsed.data.issueDate),
        expiryDate: parseDate(parsed.data.expiryDate),
        status: parsed.data.status,
        note: parsed.data.note || null,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    res.status(201).json({ item: created });
  } catch (err) {
    console.error("[dazvols] create failed", err);
    res.status(500).json({ error: "Dazvol qo‘shib bo‘lmadi" });
  }
});

router.patch("/dazvols/:id", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Dazvol ma’lumotlari noto‘g‘ri" });
      return;
    }

    const companyId = req.principal!.companyId!;

    if (parsed.data.vehicleId) {
      const vehicleOk = await assertVehicleBelongsToCompany(parsed.data.vehicleId, companyId);

      if (!vehicleOk) {
        res.status(400).json({ error: "Transport topilmadi yoki kompaniyaga tegishli emas" });
        return;
      }
    }

    const updateData: Partial<typeof dazvolsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.vehicleId !== undefined) updateData.vehicleId = parsed.data.vehicleId || null;
    if (parsed.data.permitNumber !== undefined) updateData.permitNumber = parsed.data.permitNumber;
    if (parsed.data.country !== undefined) updateData.country = parsed.data.country;
    if (parsed.data.permitType !== undefined) updateData.permitType = parsed.data.permitType;
    if (parsed.data.issueDate !== undefined) updateData.issueDate = parseDate(parsed.data.issueDate);
    if (parsed.data.expiryDate !== undefined) updateData.expiryDate = parseDate(parsed.data.expiryDate);
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.note !== undefined) updateData.note = parsed.data.note || null;

    const [updated] = await db
      .update(dazvolsTable)
      .set(updateData)
      .where(and(eq(dazvolsTable.id, req.params.id), eq(dazvolsTable.companyId, companyId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Dazvol topilmadi" });
      return;
    }

    res.json({ item: updated });
  } catch (err) {
    console.error("[dazvols] update failed", err);
    res.status(500).json({ error: "Dazvol yangilab bo‘lmadi" });
  }
});

const assignVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
});

router.post(
  "/dazvols/:id/assign-vehicle",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const parsed = assignVehicleSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({ error: "Transport noto‘g‘ri tanlangan" });
        return;
      }

      const companyId = req.principal!.companyId!;

      const vehicleOk = await assertVehicleBelongsToCompany(parsed.data.vehicleId, companyId);

      if (!vehicleOk) {
        res.status(400).json({ error: "Transport topilmadi yoki kompaniyaga tegishli emas" });
        return;
      }

      const [updated] = await db
        .update(dazvolsTable)
        .set({
          vehicleId: parsed.data.vehicleId,
          updatedAt: new Date(),
        })
        .where(and(eq(dazvolsTable.id, req.params.id), eq(dazvolsTable.companyId, companyId)))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "Dazvol topilmadi" });
        return;
      }

      res.json({ item: updated });
    } catch (err) {
      console.error("[dazvols] assign vehicle failed", err);
      res.status(500).json({ error: "Dazvolni transportga biriktirib bo‘lmadi" });
    }
  },
);

router.delete("/dazvols/:id", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const companyId = req.principal!.companyId!;

    const [deleted] = await db
      .delete(dazvolsTable)
      .where(and(eq(dazvolsTable.id, req.params.id), eq(dazvolsTable.companyId, companyId)))
      .returning({ id: dazvolsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "Dazvol topilmadi" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[dazvols] delete failed", err);
    res.status(500).json({ error: "Dazvol o‘chirib bo‘lmadi" });
  }
});

export default router;