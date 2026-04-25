import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { documentsTable, vehiclesTable } from "@workspace/db/schema";
import { and, eq, ilike, or, sql, desc, asc, gte, lte, lt } from "drizzle-orm";
import {
  ListDocumentsQueryParams,
  ListDocumentsResponse,
  CreateDocumentBody,
  GetDocumentParams,
  UpdateDocumentParams,
  UpdateDocumentBody,
  DeleteDocumentParams,
} from "@workspace/api-zod";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { statusFor, EXPIRING_THRESHOLD_DAYS } from "../lib/status";

const router: IRouter = Router();

router.get(
  "/documents",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = ListDocumentsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid query params" });
      return;
    }
    const { search, status, vehicleId, page = 1, pageSize = 20 } = parsed.data;
    const companyId = req.principal!.companyId!;
    const offset = (page - 1) * pageSize;
    const now = new Date();

    const conds = [eq(documentsTable.companyId, companyId)];
    if (vehicleId) conds.push(eq(documentsTable.vehicleId, vehicleId));
    if (search) {
      conds.push(
        or(
          ilike(documentsTable.name, `%${search}%`),
          ilike(documentsTable.number, `%${search}%`),
          ilike(vehiclesTable.name, `%${search}%`),
          ilike(vehiclesTable.plateNumber, `%${search}%`),
        )!,
      );
    }
    if (status === "expired") {
      conds.push(lt(documentsTable.endDate, now));
    } else if (status === "expiring") {
      conds.push(gte(documentsTable.endDate, now));
      conds.push(lte(documentsTable.endDate, new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000)));
    } else if (status === "valid") {
      conds.push(sql`${documentsTable.endDate} > ${new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000).toISOString()}`);
    }

    const where = and(...conds);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(where);

    const rows = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(where)
      .orderBy(asc(documentsTable.endDate))
      .limit(pageSize)
      .offset(offset);

    res.json(
      ListDocumentsResponse.parse({
        items: rows.map((r) => {
          const s = statusFor(r.doc.endDate, now);
          return {
            id: r.doc.id,
            vehicleId: r.doc.vehicleId,
            companyId: r.doc.companyId,
            vehicleName: r.vehicleName,
            vehiclePlateNumber: r.vehiclePlateNumber,
            name: r.doc.name,
            number: r.doc.number,
            startDate: r.doc.startDate,
            endDate: r.doc.endDate,
            note: r.doc.note,
            fileUrl: r.doc.fileUrl,
            fileName: r.doc.fileName,
            status: s.status,
            daysRemaining: s.daysRemaining,
            createdAt: r.doc.createdAt,
          };
        }),
        total: count,
        page,
        pageSize,
      }),
    );
  },
);

router.post(
  "/documents",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document payload" });
      return;
    }
    const companyId = req.principal!.companyId!;
    const data = parsed.data;

    const [vehicle] = await db
      .select()
      .from(vehiclesTable)
      .where(and(eq(vehiclesTable.id, data.vehicleId), eq(vehiclesTable.companyId, companyId)))
      .limit(1);
    if (!vehicle) {
      res.status(404).json({ error: "Vehicle not found" });
      return;
    }

    const [doc] = await db
      .insert(documentsTable)
      .values({
        vehicleId: data.vehicleId,
        companyId,
        name: data.name,
        number: data.number,
        startDate: data.startDate,
        endDate: data.endDate,
        note: data.note ?? null,
        fileUrl: data.fileUrl ?? null,
        fileName: data.fileName ?? null,
      })
      .returning();

    const s = statusFor(doc.endDate);
    res.status(201).json(
      ({
        id: doc.id,
        vehicleId: doc.vehicleId,
        companyId: doc.companyId,
        vehicleName: vehicle.name,
        vehiclePlateNumber: vehicle.plateNumber,
        name: doc.name,
        number: doc.number,
        startDate: doc.startDate,
        endDate: doc.endDate,
        note: doc.note,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        status: s.status,
        daysRemaining: s.daysRemaining,
        createdAt: doc.createdAt,
      }),
    );
  },
);

router.get(
  "/documents/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = GetDocumentParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const companyId = req.principal!.companyId!;
    const [row] = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.companyId, companyId)))
      .limit(1);
    if (!row) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const s = statusFor(row.doc.endDate);
    res.json(
      ({
        id: row.doc.id,
        vehicleId: row.doc.vehicleId,
        companyId: row.doc.companyId,
        vehicleName: row.vehicleName,
        vehiclePlateNumber: row.vehiclePlateNumber,
        name: row.doc.name,
        number: row.doc.number,
        startDate: row.doc.startDate,
        endDate: row.doc.endDate,
        note: row.doc.note,
        fileUrl: row.doc.fileUrl,
        fileName: row.doc.fileName,
        status: s.status,
        daysRemaining: s.daysRemaining,
        createdAt: row.doc.createdAt,
      }),
    );
  },
);

router.patch(
  "/documents/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const paramsParsed = UpdateDocumentParams.safeParse(req.params);
    const bodyParsed = UpdateDocumentBody.safeParse(req.body);
    if (!paramsParsed.success || !bodyParsed.success) {
      res.status(400).json({ error: "Invalid update payload" });
      return;
    }
    const companyId = req.principal!.companyId!;
    const updates: Record<string, unknown> = {};
    for (const k of ["name", "number", "startDate", "endDate", "note", "fileUrl", "fileName"] as const) {
      const v = (bodyParsed.data as Record<string, unknown>)[k];
      if (v !== undefined) updates[k] = v;
    }
    if ("endDate" in updates) {
      // reset notification flag so a re-extended doc can re-notify if it expires again
      (updates as Record<string, unknown>).notifiedAt = null;
    }
    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: "No fields to update" });
      return;
    }
    const [updated] = await db
      .update(documentsTable)
      .set(updates as never)
      .where(and(eq(documentsTable.id, paramsParsed.data.id), eq(documentsTable.companyId, companyId)))
      .returning();
    if (!updated) {
      res.status(404).json({ error: "Document not found" });
      return;
    }
    const [vehicle] = await db
      .select({ name: vehiclesTable.name, plateNumber: vehiclesTable.plateNumber })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.id, updated.vehicleId))
      .limit(1);
    const s = statusFor(updated.endDate);
    res.json(
      ({
        id: updated.id,
        vehicleId: updated.vehicleId,
        companyId: updated.companyId,
        vehicleName: vehicle?.name ?? null,
        vehiclePlateNumber: vehicle?.plateNumber ?? null,
        name: updated.name,
        number: updated.number,
        startDate: updated.startDate,
        endDate: updated.endDate,
        note: updated.note,
        fileUrl: updated.fileUrl,
        fileName: updated.fileName,
        status: s.status,
        daysRemaining: s.daysRemaining,
        createdAt: updated.createdAt,
      }),
    );
  },
);

router.delete(
  "/documents/:id",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = DeleteDocumentParams.safeParse(req.params);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }
    const companyId = req.principal!.companyId!;
    await db
      .delete(documentsTable)
      .where(and(eq(documentsTable.id, parsed.data.id), eq(documentsTable.companyId, companyId)));
    res.status(204).end();
  },
);

void desc;

export default router;
