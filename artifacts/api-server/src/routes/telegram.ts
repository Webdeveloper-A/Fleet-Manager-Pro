import { randomBytes } from "crypto";
import { Router, type IRouter, type Request, type Response } from "express";
import { z } from "zod";
import { and, desc, eq, gt, inArray, isNull } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  companyTelegramLinksTable,
  telegramLinkCodesTable,
  supportMessagesTable,
  supportTicketsTable,
} from "@workspace/db/schema";
import { requireAuth, requireCompany } from "../middlewares/auth";
import {
  isTelegramBotConfigured,
  sendTelegramMessageToChat,
  type TelegramBotType,
} from "../lib/telegram-bots";

const router: IRouter = Router();

const botTypeSchema = z.enum(["alerts", "support"]);

const createCodeSchema = z.object({
  botType: botTypeSchema,
});

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: {
      id: number | string;
      username?: string;
      first_name?: string;
    };
    from?: {
      username?: string;
      first_name?: string;
    };
  };
};

function makeLinkCode(botType: TelegramBotType) {
  const prefix = botType === "alerts" ? "AL" : "SP";
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}

function normalizeText(text?: string) {
  return (text ?? "").trim();
}

function extractCode(text: string) {
  const cleaned = text.trim();

  if (cleaned.toLowerCase().startsWith("/start")) {
    return cleaned.replace(/^\/start\s*/i, "").trim();
  }

  return cleaned;
}

async function findActiveLink(botType: TelegramBotType, chatId: string) {
  const [link] = await db
    .select()
    .from(companyTelegramLinksTable)
    .where(
      and(
        eq(companyTelegramLinksTable.botType, botType),
        eq(companyTelegramLinksTable.telegramChatId, chatId),
        eq(companyTelegramLinksTable.isActive, true),
      ),
    )
    .limit(1);

  return link ?? null;
}

router.get("/telegram/links", requireAuth, requireCompany, async (req: Request, res: Response) => {
  const companyId = req.principal!.companyId!;

  const rows = await db
    .select()
    .from(companyTelegramLinksTable)
    .where(eq(companyTelegramLinksTable.companyId, companyId));

  res.json({
    items: rows.map((r) => ({
      id: r.id,
      botType: r.botType,
      telegramChatId: r.telegramChatId,
      telegramUsername: r.telegramUsername,
      telegramFirstName: r.telegramFirstName,
      isActive: r.isActive,
      linkedAt: r.linkedAt,
      updatedAt: r.updatedAt,
    })),
  });
});

router.post(
  "/telegram/link-codes",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = createCodeSchema.safeParse(req.body);

    if (!parsed.success) {
      res.status(400).json({ error: "Telegram ulash turi noto‘g‘ri" });
      return;
    }

    const botType = parsed.data.botType;

    if (!isTelegramBotConfigured(botType)) {
      res.status(400).json({
        error:
          botType === "alerts"
            ? "Telegram bildirishnoma boti tokeni sozlanmagan"
            : "Telegram support boti tokeni sozlanmagan",
      });
      return;
    }

    const companyId = req.principal!.companyId!;
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 10 * 60 * 1000);
    const code = makeLinkCode(botType);

    await db.insert(telegramLinkCodesTable).values({
      companyId,
      botType,
      code,
      expiresAt,
      createdAt: now,
    });

    res.status(201).json({
      botType,
      code,
      expiresAt,
      instruction:
        botType === "alerts"
          ? "Telegram bildirishnoma botiga ushbu kodni yuboring."
          : "Telegram support botiga ushbu kodni yuboring.",
      startCommand: `/start ${code}`,
    });
  },
);

router.delete(
  "/telegram/links/:botType",
  requireAuth,
  requireCompany,
  async (req: Request, res: Response) => {
    const parsed = botTypeSchema.safeParse(req.params.botType);

    if (!parsed.success) {
      res.status(400).json({ error: "Telegram ulash turi noto‘g‘ri" });
      return;
    }

    const companyId = req.principal!.companyId!;

    await db
      .update(companyTelegramLinksTable)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(companyTelegramLinksTable.companyId, companyId),
          eq(companyTelegramLinksTable.botType, parsed.data),
        ),
      );

    res.json({ ok: true });
  },
);

async function handleLinkCode({
  botType,
  chatId,
  username,
  firstName,
  code,
}: {
  botType: TelegramBotType;
  chatId: string;
  username?: string;
  firstName?: string;
  code: string;
}) {
  const now = new Date();

  const [linkCode] = await db
    .select()
    .from(telegramLinkCodesTable)
    .where(
      and(
        eq(telegramLinkCodesTable.code, code),
        eq(telegramLinkCodesTable.botType, botType),
        isNull(telegramLinkCodesTable.usedAt),
        gt(telegramLinkCodesTable.expiresAt, now),
      ),
    )
    .limit(1);

  if (!linkCode) {
    await sendTelegramMessageToChat({
      botType,
      chatId,
      text:
        "Ulash kodi topilmadi yoki muddati tugagan. Platformadan yangi Telegram ulash kodini oling.",
    });

    return;
  }

  await db
    .insert(companyTelegramLinksTable)
    .values({
      companyId: linkCode.companyId,
      botType,
      telegramChatId: chatId,
      telegramUsername: username ?? null,
      telegramFirstName: firstName ?? null,
      isActive: true,
      linkedAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [companyTelegramLinksTable.companyId, companyTelegramLinksTable.botType],
      set: {
        telegramChatId: chatId,
        telegramUsername: username ?? null,
        telegramFirstName: firstName ?? null,
        isActive: true,
        updatedAt: now,
      },
    });

  await db
    .update(telegramLinkCodesTable)
    .set({ usedAt: now })
    .where(eq(telegramLinkCodesTable.id, linkCode.id));

  await sendTelegramMessageToChat({
    botType,
    chatId,
    text:
      botType === "alerts"
        ? "✅ Telegram bildirishnomalar muvaffaqiyatli ulandi. Endi hujjat muddati bo‘yicha xabarlar shu chatga yuboriladi."
        : "✅ Telegram support chati muvaffaqiyatli ulandi. Endi savollaringiz support markaziga yuboriladi.",
  });
}

async function handleSupportMessage({
  chatId,
  text,
}: {
  chatId: string;
  text: string;
}) {
  const link = await findActiveLink("support", chatId);

  if (!link) {
    await sendTelegramMessageToChat({
      botType: "support",
      chatId,
      text:
        "Telegram support hali platformaga ulanmagan. Platformadan support bot uchun ulash kodini oling va shu botga yuboring.",
    });

    return;
  }

  const now = new Date();

  const [activeTicket] = await db
    .select()
    .from(supportTicketsTable)
    .where(
      and(
        eq(supportTicketsTable.companyId, link.companyId),
        inArray(supportTicketsTable.status, ["open", "pending"]),
      ),
    )
    .orderBy(desc(supportTicketsTable.updatedAt))
    .limit(1);

  let ticketId = activeTicket?.id;

  if (!ticketId) {
    const subject = text.length > 80 ? `${text.slice(0, 77)}...` : text;

    const [ticket] = await db
      .insert(supportTicketsTable)
      .values({
        companyId: link.companyId,
        subject,
        status: "open",
        priority: "normal",
        createdByEmail: link.telegramUsername
          ? `telegram:@${link.telegramUsername}`
          : "telegram",
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    ticketId = ticket.id;
  }

  await db.insert(supportMessagesTable).values({
    ticketId,
    senderRole: "company",
    senderEmail: link.telegramUsername
      ? `telegram:@${link.telegramUsername}`
      : "telegram",
    body: text,
    createdAt: now,
  });

  await db
    .update(supportTicketsTable)
    .set({
      status: "open",
      updatedAt: now,
    })
    .where(eq(supportTicketsTable.id, ticketId));

  await sendTelegramMessageToChat({
    botType: "support",
    chatId,
    text: "✅ Xabaringiz support markaziga yuborildi. Mutaxassis javobi shu chatda ham ko‘rinadi.",
  });
}

router.post("/telegram/webhook/:botType", async (req: Request, res: Response) => {
  const parsed = botTypeSchema.safeParse(req.params.botType);

  if (!parsed.success) {
    res.status(400).json({ error: "Invalid bot type" });
    return;
  }

  const botType = parsed.data;
  const update = req.body as TelegramUpdate;
  const message = update.message;

  if (!message?.chat?.id) {
    res.json({ ok: true });
    return;
  }

  const chatId = String(message.chat.id);
  const text = normalizeText(message.text);
  const username = message.from?.username ?? message.chat.username;
  const firstName = message.from?.first_name ?? message.chat.first_name;

  if (!text) {
    res.json({ ok: true });
    return;
  }

  try {
    const code = extractCode(text);

    if (code.startsWith("AL-") || code.startsWith("SP-")) {
      await handleLinkCode({
        botType,
        chatId,
        username,
        firstName,
        code,
      });

      res.json({ ok: true });
      return;
    }

    if (botType === "support") {
      await handleSupportMessage({ chatId, text });
      res.json({ ok: true });
      return;
    }

    await sendTelegramMessageToChat({
      botType,
      chatId,
      text:
        "Bu bot faqat bildirishnomalar uchun. Uni ulash uchun platformadan Telegram ulash kodini oling.",
    });

    res.json({ ok: true });
  } catch (err) {
    console.error("[telegram-webhook] failed", err);
    res.json({ ok: true });
  }
});

export default router;