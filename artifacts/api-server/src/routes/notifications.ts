import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { notificationsTable, documentsTable, vehiclesTable } from "@workspace/db/schema";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { EXPIRING_THRESHOLD_DAYS, statusFor } from "../lib/status";
import { isTelegramConfigured, sendTelegramMessage } from "../lib/telegram";

const router: IRouter = Router();

function daysLabel(daysRemaining: number) {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} kun oldin tugagan`;
  if (daysRemaining === 0) return "bugun tugaydi";
  return `${daysRemaining} kun qoldi`;
}

router.get(
  "/notifications",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
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

      res.json({
        items: rows.map((r) => ({
          id: r.id,
          documentId: r.documentId,
          kind: r.kind,
          message: r.message,
          createdAt: r.createdAt,
          documentName: r.documentName,
          vehicleName: r.vehicleName,
        })),
      });
    } catch (err) {
      console.error("[notifications] list failed", err);
      res.status(500).json({ error: "Notifications list failed" });
    }
  },
);

router.post(
  "/notifications/send-telegram-test",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      if (!isTelegramConfigured()) {
        res.status(400).json({
          error: "TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan",
        });
        return;
      }

      const companyName = req.principal!.companyName ?? "Company";

      await sendTelegramMessage(
        `✅ Fleet Manager Pro test xabari\n\nKompaniya: ${companyName}\nTelegram notification ishlayapti.`,
      );

      res.json({ ok: true });
    } catch (err) {
      console.error("[telegram-test] failed", err);
      res.status(500).json({ error: "Telegram test yuborilmadi" });
    }
  },
);

router.post(
  "/notifications/send-expiry-alerts",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      if (!isTelegramConfigured()) {
        res.status(400).json({
          error: "TELEGRAM_BOT_TOKEN yoki TELEGRAM_CHAT_ID sozlanmagan",
        });
        return;
      }

      const companyId = req.principal!.companyId!;
      const companyName = req.principal!.companyName ?? "Company";
      const now = new Date();
      const horizon = new Date(now.getTime() + EXPIRING_THRESHOLD_DAYS * 86400000);

      const rows = await db
        .select({
          doc: documentsTable,
          vehicleName: vehiclesTable.name,
          vehiclePlateNumber: vehiclesTable.plateNumber,
        })
        .from(documentsTable)
        .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
        .where(and(eq(documentsTable.companyId, companyId), lte(documentsTable.endDate, horizon)))
        .orderBy(asc(documentsTable.endDate))
        .limit(20);

      if (rows.length === 0) {
        await sendTelegramMessage(
          `✅ Fleet Manager Pro\n\nKompaniya: ${companyName}\nMuddati yaqin yoki o‘tgan hujjatlar topilmadi.`,
        );

        res.json({ ok: true, sent: 1, documents: 0 });
        return;
      }

      const lines = rows.map((r, index) => {
        const s = statusFor(r.doc.endDate, now);
        const vehicle = `${r.vehicleName ?? "Transport"} ${
          r.vehiclePlateNumber ? `(${r.vehiclePlateNumber})` : ""
        }`;

        return [
          `${index + 1}. ${vehicle}`,
          `   Hujjat: ${r.doc.name}`,
          `   Raqam: ${r.doc.number}`,
          `   Holat: ${daysLabel(s.daysRemaining)}`,
        ].join("\n");
      });

      const message = [
        "⚠️ Fleet Manager Pro ogohlantirish",
        "",
        `Kompaniya: ${companyName}`,
        `Topilgan hujjatlar: ${rows.length}`,
        "",
        ...lines,
      ].join("\n");

      await sendTelegramMessage(message);

      res.json({
        ok: true,
        sent: 1,
        documents: rows.length,
      });
    } catch (err) {
      console.error("[telegram-expiry-alerts] failed", err);
      res.status(500).json({ error: "Telegram alert yuborilmadi" });
    }
  },
);

export default router;