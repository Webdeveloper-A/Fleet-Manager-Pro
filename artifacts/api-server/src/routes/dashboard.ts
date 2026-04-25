import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { documentsTable, vehiclesTable } from "@workspace/db/schema";
import { and, eq, sql, asc, desc, lt } from "drizzle-orm";
import { GetDashboardSummaryResponse } from "@workspace/api-zod";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { statusFor, EXPIRING_THRESHOLD_DAYS } from "../lib/status";

const router: IRouter = Router();

router.get(
  "/dashboard/summary",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.principal!.companyId!;
    const now = new Date();
    const horizon = new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000);

    const [vehicleCountRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(vehiclesTable)
      .where(eq(vehiclesTable.companyId, companyId));

    const [docCountRow] = await db
      .select({ c: sql<number>`count(*)::int` })
      .from(documentsTable)
      .where(eq(documentsTable.companyId, companyId));

    const [bucketsRow] = await db
      .select({
        validCount: sql<number>`count(*) filter (where ${documentsTable.endDate} > ${horizon.toISOString()})::int`,
        expiringCount: sql<number>`count(*) filter (where ${documentsTable.endDate} >= ${now.toISOString()} and ${documentsTable.endDate} <= ${horizon.toISOString()})::int`,
        expiredCount: sql<number>`count(*) filter (where ${documentsTable.endDate} < ${now.toISOString()})::int`,
      })
      .from(documentsTable)
      .where(eq(documentsTable.companyId, companyId));

    const upcoming = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(
        and(
          eq(documentsTable.companyId, companyId),
          sql`${documentsTable.endDate} >= ${now.toISOString()}`,
          sql`${documentsTable.endDate} <= ${horizon.toISOString()}`,
        ),
      )
      .orderBy(asc(documentsTable.endDate))
      .limit(8);

    const recentlyExpired = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(and(eq(documentsTable.companyId, companyId), lt(documentsTable.endDate, now)))
      .orderBy(desc(documentsTable.endDate))
      .limit(8);

    const mapDoc = (r: { doc: typeof documentsTable.$inferSelect; vehicleName: string | null; vehiclePlateNumber: string | null }) => {
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
    };

    res.json(
      GetDashboardSummaryResponse.parse({
        totalVehicles: vehicleCountRow.c,
        totalDocuments: docCountRow.c,
        validCount: bucketsRow.validCount,
        expiringCount: bucketsRow.expiringCount,
        expiredCount: bucketsRow.expiredCount,
        upcomingExpirations: upcoming.map(mapDoc),
        recentlyExpired: recentlyExpired.map(mapDoc),
      }),
    );
  },
);

export default router;
