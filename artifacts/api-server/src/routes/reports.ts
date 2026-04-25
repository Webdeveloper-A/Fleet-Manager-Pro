import { Router, type IRouter, type Request, type Response } from "express";
import ExcelJS from "exceljs";
import { db } from "@workspace/db";
import { documentsTable, vehiclesTable } from "@workspace/db/schema";
import { and, asc, eq, gte, lte, lt, sql } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { statusFor, EXPIRING_THRESHOLD_DAYS } from "../lib/status";

const router: IRouter = Router();

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("uz-UZ");
}

function statusLabel(status: string) {
  if (status === "valid") return "Amalda";
  if (status === "expiring") return "Muddati yaqin";
  if (status === "expired") return "Muddati o‘tgan";
  return status;
}

router.get(
  "/reports/expiring-documents.xlsx",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.principal!.companyId!;
    const now = new Date();
    const horizon = new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000);

    const rows = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
        driverName: vehiclesTable.driverName,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(
        and(
          eq(documentsTable.companyId, companyId),
          gte(documentsTable.endDate, now),
          lte(documentsTable.endDate, horizon),
        ),
      )
      .orderBy(asc(documentsTable.endDate));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Fleet Manager Pro";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Muddati yaqin hujjatlar");

    worksheet.columns = [
      { header: "№", key: "index", width: 8 },
      { header: "Transport", key: "vehicleName", width: 25 },
      { header: "Davlat raqami", key: "plateNumber", width: 18 },
      { header: "Haydovchi", key: "driverName", width: 25 },
      { header: "Hujjat nomi", key: "documentName", width: 28 },
      { header: "Hujjat raqami", key: "documentNumber", width: 20 },
      { header: "Boshlanish sanasi", key: "startDate", width: 18 },
      { header: "Tugash sanasi", key: "endDate", width: 18 },
      { header: "Qolgan kun", key: "daysRemaining", width: 14 },
      { header: "Status", key: "status", width: 18 },
      { header: "Fayl", key: "fileName", width: 30 },
      { header: "Izoh", key: "note", width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    rows.forEach((r, index) => {
      const s = statusFor(r.doc.endDate, now);

      worksheet.addRow({
        index: index + 1,
        vehicleName: r.vehicleName ?? "",
        plateNumber: r.vehiclePlateNumber ?? "",
        driverName: r.driverName ?? "",
        documentName: r.doc.name,
        documentNumber: r.doc.number,
        startDate: formatDate(r.doc.startDate),
        endDate: formatDate(r.doc.endDate),
        daysRemaining: s.daysRemaining,
        status: statusLabel(s.status),
        fileName: r.doc.fileName ?? "",
        note: r.doc.note ?? "",
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    });

    worksheet.autoFilter = {
      from: "A1",
      to: "L1",
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="expiring-documents.xlsx"',
    );

    res.send(Buffer.from(buffer));
  },
);

router.get(
  "/reports/expired-documents.xlsx",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const companyId = req.principal!.companyId!;
    const now = new Date();

    const rows = await db
      .select({
        doc: documentsTable,
        vehicleName: vehiclesTable.name,
        vehiclePlateNumber: vehiclesTable.plateNumber,
        driverName: vehiclesTable.driverName,
      })
      .from(documentsTable)
      .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
      .where(and(eq(documentsTable.companyId, companyId), lt(documentsTable.endDate, now)))
      .orderBy(asc(documentsTable.endDate));

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Fleet Manager Pro";
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Muddati o‘tgan hujjatlar");

    worksheet.columns = [
      { header: "№", key: "index", width: 8 },
      { header: "Transport", key: "vehicleName", width: 25 },
      { header: "Davlat raqami", key: "plateNumber", width: 18 },
      { header: "Haydovchi", key: "driverName", width: 25 },
      { header: "Hujjat nomi", key: "documentName", width: 28 },
      { header: "Hujjat raqami", key: "documentNumber", width: 20 },
      { header: "Boshlanish sanasi", key: "startDate", width: 18 },
      { header: "Tugash sanasi", key: "endDate", width: 18 },
      { header: "O‘tgan kun", key: "daysRemaining", width: 14 },
      { header: "Status", key: "status", width: 18 },
      { header: "Fayl", key: "fileName", width: 30 },
      { header: "Izoh", key: "note", width: 35 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: "middle", horizontal: "center" };

    rows.forEach((r, index) => {
      const s = statusFor(r.doc.endDate, now);

      worksheet.addRow({
        index: index + 1,
        vehicleName: r.vehicleName ?? "",
        plateNumber: r.vehiclePlateNumber ?? "",
        driverName: r.driverName ?? "",
        documentName: r.doc.name,
        documentNumber: r.doc.number,
        startDate: formatDate(r.doc.startDate),
        endDate: formatDate(r.doc.endDate),
        daysRemaining: s.daysRemaining,
        status: statusLabel(s.status),
        fileName: r.doc.fileName ?? "",
        note: r.doc.note ?? "",
      });
    });

    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
        cell.alignment = {
          vertical: "middle",
          wrapText: true,
        };
      });
    });

    worksheet.autoFilter = {
      from: "A1",
      to: "L1",
    };

    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      'attachment; filename="expired-documents.xlsx"',
    );

    res.send(Buffer.from(buffer));
  },
);

void sql;

export default router;