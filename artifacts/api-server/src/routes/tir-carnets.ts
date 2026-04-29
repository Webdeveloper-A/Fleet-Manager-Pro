import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, ilike, isNotNull, isNull, or, sql, type SQL } from "drizzle-orm";
import { db } from "@workspace/db";
import { tirCarnetsTable, vehiclesTable } from "@workspace/db/schema";
import { requireAuth, requireCompany } from "../middlewares/auth";

const router: IRouter = Router();

const statusSchema = z.enum(["active", "used", "expired"]);

const optionalUuidSchema = z.preprocess(
  (value) => (value === "" ? null : value),
  z.string().uuid().optional().nullable(),
);

const createSchema = z.object({
  carnetNumber: z.string().trim().min(1).max(128),
  route: z.string().trim().max(255).optional().nullable(),
  issueDate: z.string().optional().nullable(),
  expiryDate: z.string().optional().nullable(),
  status: statusSchema.optional().default("active"),
  note: z.string().trim().max(5000).optional().nullable(),
  vehicleId: optionalUuidSchema,
});

const updateSchema = createSchema.partial();

const assignVehicleSchema = z.object({
  vehicleId: z.string().uuid(),
});

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
  vehicleId: string | null;
  vehicleName: string | null;
  vehiclePlateNumber: string | null;
  carnetNumber: string;
  route: string | null;
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
    carnetNumber: row.carnetNumber,
    route: row.route,
    issueDate: row.issueDate,
    expiryDate: row.expiryDate,
    status: row.status,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

router.get("/tir-carnets", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const companyId = req.principal!.companyId!;
    const search = String(req.query.search ?? "").trim();
    const status = String(req.query.status ?? "").trim();
    const vehicleId = String(req.query.vehicleId ?? "").trim();
    const assignment = String(req.query.assignment ?? "all").trim();

    const page = Math.max(Number(req.query.page ?? 1), 1);
    const pageSize = Math.min(Math.max(Number(req.query.pageSize ?? 20), 1), 100);
    const offset = (page - 1) * pageSize;

    const filters: SQL[] = [eq(tirCarnetsTable.companyId, companyId)];
if (assignment === "assigned") {
  filters.push(isNotNull(tirCarnetsTable.vehicleId));
}

if (assignment === "unassigned") {
  filters.push(isNull(tirCarnetsTable.vehicleId));
}
    if (status && status !== "all") {
      filters.push(eq(tirCarnetsTable.status, status));
    }

    if (vehicleId && vehicleId !== "all") {
      filters.push(eq(tirCarnetsTable.vehicleId, vehicleId));
    }

    if (search) {
      filters.push(
        or(
          ilike(tirCarnetsTable.carnetNumber, `%${search}%`),
          ilike(tirCarnetsTable.route, `%${search}%`),
          ilike(vehiclesTable.name, `%${search}%`),
          ilike(vehiclesTable.plateNumber, `%${search}%`),
        )!,
      );
    }

    const where = and(...filters);

    const rows = await db
      .select({
        id: tirCarnetsTable.id,
        companyId: tirCarnetsTable.companyId,
        vehicleId: tirCarnetsTable.vehicleId,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
        carnetNumber: tirCarnetsTable.carnetNumber,
        route: tirCarnetsTable.route,
        issueDate: tirCarnetsTable.issueDate,
        expiryDate: tirCarnetsTable.expiryDate,
        status: tirCarnetsTable.status,
        note: tirCarnetsTable.note,
        createdAt: tirCarnetsTable.createdAt,
        updatedAt: tirCarnetsTable.updatedAt,
      })
      .from(tirCarnetsTable)
      .leftJoin(vehiclesTable, eq(tirCarnetsTable.vehicleId, vehiclesTable.id))
      .where(where)
      .orderBy(desc(tirCarnetsTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    const [countRow] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tirCarnetsTable)
      .leftJoin(vehiclesTable, eq(tirCarnetsTable.vehicleId, vehiclesTable.id))
      .where(where);

    res.json({
      items: rows.map(mapRow),
      total: countRow?.count ?? 0,
      page,
      pageSize,
    });
  } catch (err) {
    console.error("[tir-carnets] list failed", err);
    res.status(500).json({ error: "TIR Carnet ro‘yxatini yuklab bo‘lmadi" });
  }
});

router.post("/tir-carnets", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const parsed = createSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "TIR Carnet ma’lumotlari noto‘g‘ri",
        details: parsed.error.flatten(),
      });
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
      .insert(tirCarnetsTable)
      .values({
        companyId,
        vehicleId: parsed.data.vehicleId || null,
        carnetNumber: parsed.data.carnetNumber,
        route: parsed.data.route || null,
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
    console.error("[tir-carnets] create failed", err);
    res.status(500).json({ error: "TIR Carnet qo‘shib bo‘lmadi" });
  }
});

router.patch("/tir-carnets/:id", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const parsed = updateSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({
        error: "TIR Carnet ma’lumotlari noto‘g‘ri",
        details: parsed.error.flatten(),
      });
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

    const updateData: Partial<typeof tirCarnetsTable.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (parsed.data.vehicleId !== undefined) updateData.vehicleId = parsed.data.vehicleId || null;
    if (parsed.data.carnetNumber !== undefined) updateData.carnetNumber = parsed.data.carnetNumber;
    if (parsed.data.route !== undefined) updateData.route = parsed.data.route || null;
    if (parsed.data.issueDate !== undefined) {
      updateData.issueDate = parseDate(parsed.data.issueDate);
    }
    if (parsed.data.expiryDate !== undefined) {
      updateData.expiryDate = parseDate(parsed.data.expiryDate);
    }
    if (parsed.data.status !== undefined) updateData.status = parsed.data.status;
    if (parsed.data.note !== undefined) updateData.note = parsed.data.note || null;

    const [updated] = await db
      .update(tirCarnetsTable)
      .set(updateData)
      .where(and(eq(tirCarnetsTable.id, id), eq(tirCarnetsTable.companyId, companyId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "TIR Carnet topilmadi" });
      return;
    }

    res.json({ item: updated });
  } catch (err) {
    console.error("[tir-carnets] update failed", err);
    res.status(500).json({ error: "TIR Carnet yangilab bo‘lmadi" });
  }
});

router.post(
  "/tir-carnets/:id/assign-vehicle",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const parsed = assignVehicleSchema.safeParse(req.body);

      if (!parsed.success) {
        res.status(400).json({
          error: "Transport noto‘g‘ri tanlangan",
          details: parsed.error.flatten(),
        });
        return;
      }

      const companyId = req.principal!.companyId!;
      const vehicleOk = await assertVehicleBelongsToCompany(parsed.data.vehicleId, companyId);

      if (!vehicleOk) {
        res.status(400).json({ error: "Transport topilmadi yoki kompaniyaga tegishli emas" });
        return;
      }

      const [updated] = await db
        .update(tirCarnetsTable)
        .set({
          vehicleId: parsed.data.vehicleId,
          updatedAt: new Date(),
        })
        .where(and(eq(tirCarnetsTable.id, id), eq(tirCarnetsTable.companyId, companyId)))
        .returning();

      if (!updated) {
        res.status(404).json({ error: "TIR Carnet topilmadi" });
        return;
      }

      res.json({ item: updated });
    } catch (err) {
      console.error("[tir-carnets] assign vehicle failed", err);
      res.status(500).json({ error: "TIR Carnetni transportga biriktirib bo‘lmadi" });
    }
  },
);

router.delete("/tir-carnets/:id", requireAuth, requireCompany, async (req: Request, res: Response) => {
  try {
    const id = String(req.params.id);
    const companyId = req.principal!.companyId!;

    const [deleted] = await db
      .delete(tirCarnetsTable)
      .where(and(eq(tirCarnetsTable.id, id), eq(tirCarnetsTable.companyId, companyId)))
      .returning({ id: tirCarnetsTable.id });

    if (!deleted) {
      res.status(404).json({ error: "TIR Carnet topilmadi" });
      return;
    }

    res.json({ ok: true });
  } catch (err) {
    console.error("[tir-carnets] delete failed", err);
    res.status(500).json({ error: "TIR Carnet o‘chirib bo‘lmadi" });
  }
});

export default router;