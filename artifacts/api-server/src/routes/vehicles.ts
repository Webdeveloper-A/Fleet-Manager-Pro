import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { vehiclesTable, documentsTable } from "@workspace/db/schema";
import { and, eq, ilike, or, sql, desc, asc } from "drizzle-orm";
import {
  ListVehiclesQueryParams,
  ListVehiclesResponse,
  CreateVehicleBody,
  GetVehicleParams,
  UpdateVehicleParams,
  UpdateVehicleBody,
  DeleteVehicleParams,
} from "@workspace/api-zod";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { statusFor, EXPIRING_THRESHOLD_DAYS } from "../lib/status";

const router: IRouter = Router();

function vehicleStatusBundle(now: Date) {
  const horizon = new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000);

  return {
    documentCountSql:
      sql<number>`(select count(*)::int from documents where documents.vehicle_id = vehicles.id)`.mapWith(
        Number,
      ),
    nextExpirySql:
      sql<Date | null>`(select min(documents.end_date) from documents where documents.vehicle_id = vehicles.id)`,
    expiredCountSql:
      sql<number>`(select count(*)::int from documents where documents.vehicle_id = vehicles.id and documents.end_date < ${now.toISOString()})`.mapWith(
        Number,
      ),
    expiringCountSql:
      sql<number>`(select count(*)::int from documents where documents.vehicle_id = vehicles.id and documents.end_date >= ${now.toISOString()} and documents.end_date <= ${horizon.toISOString()})`.mapWith(
        Number,
      ),
  };
}

function worstStatusFor(
  documentCount: number,
  expiredCount: number,
  expiringCount: number,
): "valid" | "expiring" | "expired" | "none" {
  if (documentCount === 0) return "none";
  if (expiredCount > 0) return "expired";
  if (expiringCount > 0) return "expiring";
  return "valid";
}

function cleanTrailerPayload(data: {
  hasTrailer?: boolean | null;
  trailerPlateNumber?: string | null;
  trailerModel?: string | null;
  trailerCapacityKg?: number | null;
  trailerNote?: string | null;
}) {
  const hasTrailer = Boolean(data.hasTrailer);

  return {
    hasTrailer,
    trailerPlateNumber: hasTrailer ? data.trailerPlateNumber ?? null : null,
    trailerModel: hasTrailer ? data.trailerModel ?? null : null,
    trailerCapacityKg: hasTrailer ? data.trailerCapacityKg ?? null : null,
    trailerNote: hasTrailer ? data.trailerNote ?? null : null,
  };
}

router.get(
  "/vehicles",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = ListVehiclesQueryParams.safeParse(req.query);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }

    const { search, page = 1, pageSize = 20 } = parsed.data;
    const companyId = req.principal!.companyId!;
    const offset = (page - 1) * pageSize;
    const now = new Date();

    const searchCond = search
      ? or(
          ilike(vehiclesTable.name, `%${search}%`),
          ilike(vehiclesTable.plateNumber, `%${search}%`),
          ilike(vehiclesTable.vinCode, `%${search}%`),
          ilike(vehiclesTable.trailerPlateNumber, `%${search}%`),
        )
      : undefined;

    const where = and(eq(vehiclesTable.companyId, companyId), searchCond);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(vehiclesTable)
      .where(where);

    const exprs = vehicleStatusBundle(now);

    const rows = await db
      .select({
        id: vehiclesTable.id,
        companyId: vehiclesTable.companyId,
        name: vehiclesTable.name,
        plateNumber: vehiclesTable.plateNumber,
        vinCode: vehiclesTable.vinCode,
        year: vehiclesTable.year,
        techPassportSeries: vehiclesTable.techPassportSeries,
        driverName: vehiclesTable.driverName,
        hasTrailer: vehiclesTable.hasTrailer,
        trailerPlateNumber: vehiclesTable.trailerPlateNumber,
        trailerModel: vehiclesTable.trailerModel,
        trailerCapacityKg: vehiclesTable.trailerCapacityKg,
        trailerNote: vehiclesTable.trailerNote,
        createdAt: vehiclesTable.createdAt,
        documentCount: exprs.documentCountSql,
        nextExpiryAt: exprs.nextExpirySql,
        expiredCount: exprs.expiredCountSql,
        expiringCount: exprs.expiringCountSql,
      })
      .from(vehiclesTable)
      .where(where)
      .orderBy(desc(vehiclesTable.createdAt))
      .limit(pageSize)
      .offset(offset);

    res.json(
      ListVehiclesResponse.parse({
        items: rows.map((r) => ({
          id: r.id,
          companyId: r.companyId,
          name: r.name,
          plateNumber: r.plateNumber,
          vinCode: r.vinCode,
          year: r.year,
          techPassportSeries: r.techPassportSeries,
          driverName: r.driverName,
          hasTrailer: r.hasTrailer,
          trailerPlateNumber: r.trailerPlateNumber,
          trailerModel: r.trailerModel,
          trailerCapacityKg: r.trailerCapacityKg,
          trailerNote: r.trailerNote,
          createdAt: r.createdAt,
          documentCount: r.documentCount ?? 0,
          worstStatus: worstStatusFor(
            r.documentCount ?? 0,
            r.expiredCount ?? 0,
            r.expiringCount ?? 0,
          ),
          nextExpiryAt: r.nextExpiryAt,
        })),
        total: count,
        page,
        pageSize,
      }),
    );
  },
);

router.post(
  "/vehicles",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = CreateVehicleBody.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid vehicle payload" });
      return;
    }

    const companyId = req.principal!.companyId!;
    const data = parsed.data;
    const trailer = cleanTrailerPayload(data);

    const [vehicle] = await db
      .insert(vehiclesTable)
      .values({
        companyId,
        name: data.name,
        plateNumber: data.plateNumber,
        vinCode: data.vinCode,
        year: data.year,
        techPassportSeries: data.techPassportSeries ?? null,
        driverName: data.driverName ?? null,
        ...trailer,
      })
      .returning();

    res.status(201).json({
      id: vehicle.id,
      companyId: vehicle.companyId,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      vinCode: vehicle.vinCode,
      year: vehicle.year,
      techPassportSeries: vehicle.techPassportSeries,
      driverName: vehicle.driverName,
      hasTrailer: vehicle.hasTrailer,
      trailerPlateNumber: vehicle.trailerPlateNumber,
      trailerModel: vehicle.trailerModel,
      trailerCapacityKg: vehicle.trailerCapacityKg,
      trailerNote: vehicle.trailerNote,
      createdAt: vehicle.createdAt,
      documentCount: 0,
      worstStatus: "none",
      nextExpiryAt: null,
    });
  },
);

router.get(
  "/vehicles/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = GetVehicleParams.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const companyId = req.principal!.companyId!;

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, parsed.data.id), eq(vehiclesTable.companyId, companyId)))
      .limit(1);

    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    const docs = await db
      .select()
      .from(documentsTable)
      .where(eq(documentsTable.vehicleId, vehicle.id))
      .orderBy(asc(documentsTable.endDate));

    const now = new Date();
    let expired = 0;
    let expiring = 0;
    let nextExpiry: Date | null = null;

    const docsOut = docs.map((d) => {
      const { status, daysRemaining } = statusFor(d.endDate, now);

      if (status === "expired") expired++;
      else if (status === "expiring") expiring++;

      if (!nextExpiry || d.endDate < nextExpiry) nextExpiry = d.endDate;

      return {
        id: d.id,
        vehicleId: d.vehicleId,
        companyId: d.companyId,
        vehicleName: vehicle.name,
        vehiclePlateNumber: vehicle.plateNumber,
        name: d.name,
        number: d.number,
        startDate: d.startDate,
        endDate: d.endDate,
        note: d.note,
        fileUrl: d.fileUrl,
        fileName: d.fileName,
        status,
        daysRemaining,
        createdAt: d.createdAt,
      };
    });

    res.json({
      id: vehicle.id,
      companyId: vehicle.companyId,
      name: vehicle.name,
      plateNumber: vehicle.plateNumber,
      vinCode: vehicle.vinCode,
      year: vehicle.year,
      techPassportSeries: vehicle.techPassportSeries,
      driverName: vehicle.driverName,
      hasTrailer: vehicle.hasTrailer,
      trailerPlateNumber: vehicle.trailerPlateNumber,
      trailerModel: vehicle.trailerModel,
      trailerCapacityKg: vehicle.trailerCapacityKg,
      trailerNote: vehicle.trailerNote,
      createdAt: vehicle.createdAt,
      documentCount: docs.length,
      worstStatus: worstStatusFor(docs.length, expired, expiring),
      nextExpiryAt: nextExpiry,
      documents: docsOut,
    });
  },
);

router.patch(
  "/vehicles/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const paramsParsed = UpdateVehicleParams.safeParse(req.params);
    const bodyParsed = UpdateVehicleBody.safeParse(req.body);

    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid update payload" });
      return;
    }

    const companyId = req.principal!.companyId!;
    const data = bodyParsed.data;

    const updates: Record<string, unknown> = {};

    for (const k of [
      "name",
      "plateNumber",
      "vinCode",
      "year",
      "techPassportSeries",
      "driverName",
    ] as const) {
      const v = data[k];
      if (v !== undefined) updates[k] = v;
    }

    if (data.hasTrailer !== undefined) {
      updates.hasTrailer = data.hasTrailer;

      if (data.hasTrailer === false) {
        updates.trailerPlateNumber = null;
        updates.trailerModel = null;
        updates.trailerCapacityKg = null;
        updates.trailerNote = null;
      }
    }

    if (data.hasTrailer === true) {
      updates.trailerPlateNumber = data.trailerPlateNumber ?? null;
      updates.trailerModel = data.trailerModel ?? null;
      updates.trailerCapacityKg = data.trailerCapacityKg ?? null;
      updates.trailerNote = data.trailerNote ?? null;
    }

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }

    const [updated] = await db
      .update(vehiclesTable)
      .set(updates as never)
      .where(and(eq(vehiclesTable.id, paramsParsed.data.id), eq(vehiclesTable.companyId, companyId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    res.json({
      id: updated.id,
      companyId: updated.companyId,
      name: updated.name,
      plateNumber: updated.plateNumber,
      vinCode: updated.vinCode,
      year: updated.year,
      techPassportSeries: updated.techPassportSeries,
      driverName: updated.driverName,
      hasTrailer: updated.hasTrailer,
      trailerPlateNumber: updated.trailerPlateNumber,
      trailerModel: updated.trailerModel,
      trailerCapacityKg: updated.trailerCapacityKg,
      trailerNote: updated.trailerNote,
      createdAt: updated.createdAt,
      documentCount: 0,
      worstStatus: "none",
      nextExpiryAt: null,
    });
  },
);

router.delete(
  "/vehicles/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = DeleteVehicleParams.safeParse(req.params);

    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const companyId = req.principal!.companyId!;

    await db
      .delete(vehiclesTable)
      .where(and(eq(vehiclesTable.id, parsed.data.id), eq(vehiclesTable.companyId, companyId)));

    res.status(204).end();
  },
);

export default router;