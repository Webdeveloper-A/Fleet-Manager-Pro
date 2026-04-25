import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable, documentsTable, vehiclesTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { ListNotificationsResponse } from "@workspace/api-zod";
import { requireAuth, requireCompany } from "../middlewares/auth";

const router: IRouter = Router();

router.get(
  "/notifications",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.principal!.companyId!;
    const rows = await db
      .select({
        id: notificationsTable.id,
        documentId: notificationsTable.documentId,
        kind: notificationsTable.kind,
        message: notificationsTable.message,
        createdAt: notificationsTable.createdAt,
        documentName: documentsTable.name,
        vehicleName: vehiclesTable.name,
      })
      .from(notificationsTable)
      .leftJoin(documentsTable, eq(notificationsTable.documentId, documentsTable.id))
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(eq(notificationsTable.companyId, companyId))
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);

    res.json(
      ListNotificationsResponse.parse({
        items: rows.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          kind: r.kind,
          message: r.message,
          createdAt: r.createdAt,
          documentName: r.documentName,
          vehicleName: r.vehicleName,
        })),
      }),
    );
  },
);

export default router;
