import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import {
  companyTelegramLinksTable,
  documentsTable,
  notificationsTable,
  vehiclesTable,
} from "@workspace/db/schema";
import { and, asc, desc, eq, lte } from "drizzle-orm";
import { requireAuth, requireCompany } from "../middlewares/auth";
import { EXPIRING_THRESHOLD_DAYS, statusFor } from "../lib/status";
import { isTelegramBotConfigured, sendTelegramMessageToChat } from "../lib/telegram-bots";

const router: IRouter = Router();

function daysLabel(daysRemaining: number) {
  if (daysRemaining < 0) return `${Math.abs(daysRemaining)} kun oldin tugagan`;
  if (daysRemaining === 0) return "bugun tugaydi";
  return `${daysRemaining} kun qoldi`;
}

function dateLabel(value: Date) {
  return value.toLocaleDateString("uz-UZ", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

async function getCompanyTelegramLink(companyId: string) {
  const [link] = await db
    .select()
    .from(companyTelegramLinksTable)
    .where(
      and(
        eq(companyTelegramLinksTable.companyId, companyId),
        eq(companyTelegramLinksTable.botType, "alerts"),
        eq(companyTelegramLinksTable.isActive, true),
      ),
    )
    .limit(1);

  return link ?? null;
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
      res.status(500).json({ error: "Bildirishnomalar ro‘yxatini yuklab bo‘lmadi" });
    }
  },
);

router.post(
  "/notifications/send-telegram-test",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      if (!isTelegramBotConfigured("alerts")) {
        res.status(400).json({
          error: "Telegram bildirishnoma boti tokeni sozlanmagan",
        });
        return;
      }

      const companyId = req.principal!.companyId!;
      const companyName = req.principal!.companyName ?? "Kompaniya";

      const link = await getCompanyTelegramLink(companyId);

      if (!link) {
        res.status(400).json({
          error:
            "Telegram bildirishnoma boti ushbu kompaniyaga ulanmagan. Avval Telegram ulash kodini oling.",
        });
        return;
      }

      await sendTelegramMessageToChat({
        botType: "alerts",
        chatId: link.telegramChatId,
        text: [
          "✅ Fleet Docs test bildirishnomasi",
          "",
          `Kompaniya: ${companyName}`,
          "Telegram bildirishnomalari muvaffaqiyatli ishlayapti.",
        ].join("\n"),
      });

      res.json({ ok: true, sent: 1 });
    } catch (err) {
      console.error("[telegram-test] failed", err);
      res.status(500).json({ error: "Telegram test xabarini yuborib bo‘lmadi" });
    }
  },
);

router.post(
  "/notifications/send-expiry-alerts",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    try {
      if (!isTelegramBotConfigured("alerts")) {
        res.status(400).json({
          error: "Telegram bildirishnoma boti tokeni sozlanmagan",
        });
        return;
      }

      const companyId = req.principal!.companyId!;
      const companyName = req.principal!.companyName ?? "Kompaniya";

      const link = await getCompanyTelegramLink(companyId);

      if (!link) {
        res.status(400).json({
          error:
            "Telegram bildirishnoma boti ushbu kompaniyaga ulanmagan. Avval Telegram ulash kodini oling.",
        });
        return;
      }

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
        await sendTelegramMessageToChat({
          botType: "alerts",
          chatId: link.telegramChatId,
          text: [
            "✅ Fleet Docs",
            "",
            `Kompaniya: ${companyName}`,
            "Muddati yaqinlashgan yoki muddati o‘tgan hujjatlar topilmadi.",
          ].join("\n"),
        });

        res.json({ ok: true, sent: 1, documents: 0 });
        return;
      }

      const lines = rows.map((r, index) => {
        const { status, daysRemaining } = statusFor(r.doc.endDate, now);
        const statusText =
          status === "expired"
            ? "Muddati o‘tgan"
            : status === "expiring"
              ? "Muddati yaqin"
              : "Amalda";

        return [
          `${index + 1}. ${r.doc.name}`,
          `   Transport: ${r.vehicleName ?? "Noma’lum"}${
            r.vehiclePlateNumber ? ` (${r.vehiclePlateNumber})` : ""
          }`,
          `   Tugash sanasi: ${dateLabel(r.doc.endDate)} — ${daysLabel(daysRemaining)}`,
          `   Holat: ${statusText}`,
        ].join("\n");
      });

      const message = [
        "⚠️ Fleet Docs hujjat muddati bo‘yicha ogohlantirish",
        "",
        `Kompaniya: ${companyName}`,
        `Topilgan hujjatlar: ${rows.length}`,
        "",
        ...lines,
      ].join("\n");

      await sendTelegramMessageToChat({
        botType: "alerts",
        chatId: link.telegramChatId,
        text: message,
      });

      res.json({
        ok: true,
        sent: 1,
        documents: rows.length,
      });
    } catch (err) {
      console.error("[telegram-expiry-alerts] failed", err);
      res.status(500).json({ error: "Telegram ogohlantirishini yuborib bo‘lmadi" });
    }
  },
);

export default router;