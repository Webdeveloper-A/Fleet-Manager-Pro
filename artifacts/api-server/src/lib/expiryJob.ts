import cron from "node-cron";
import { db } from "@workspace/db";
import { documentsTable, notificationsTable, vehiclesTable } from "@workspace/db/schema";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { NOTIFY_THRESHOLD_DAYS } from "./status";
import { isTelegramConfigured, sendTelegramMessage } from "./telegram";

type CreatedAlert = {
  companyId: string;
  documentId: string;
  kind: "expired" | "expiring_soon";
  message: string;
};

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildTelegramSummary(alerts: CreatedAlert[]) {
  const lines = alerts.slice(0, 20).map((alert, index) => {
    const icon = alert.kind === "expired" ? "⛔" : "⚠️";
    return `${index + 1}. ${icon} ${alert.message}`;
  });

  const extraCount = alerts.length > 20 ? `\n\nYana ${alerts.length - 20} ta ogohlantirish bor.` : "";

  return [
    "🚚 Fleet Manager Pro avtomatik ogohlantirish",
    "",
    `Yangi ogohlantirishlar soni: ${alerts.length}`,
    "",
    ...lines,
    extraCount,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Find documents expiring within NOTIFY_THRESHOLD_DAYS that haven't been
 * notified yet, create one notification per document, and optionally send
 * a Telegram summary if Telegram env variables are configured.
 */
export async function runExpiryNotificationJob(): Promise<{ created: number }> {
  const now = new Date();
  const horizon = new Date(now.getTime() + NOTIFY_THRESHOLD_DAYS * 86400000);

  const candidates = await db
    .select({
      id: documentsTable.id,
      companyId: documentsTable.companyId,
      vehicleId: documentsTable.vehicleId,
      name: documentsTable.name,
      number: documentsTable.number,
      endDate: documentsTable.endDate,
      vehicleName: vehiclesTable.name,
      vehiclePlateNumber: vehiclesTable.plateNumber,
    })
    .from(documentsTable)
    .leftJoin(vehiclesTable, eq(documentsTable.vehicleId, vehiclesTable.id))
    .where(
      and(
        isNull(documentsTable.notifiedAt),
        lte(documentsTable.endDate, horizon),
      ),
    );

  if (candidates.length === 0) {
    return { created: 0 };
  }

  const createdAlerts: CreatedAlert[] = [];

  for (const c of candidates) {
    const isExpired = c.endDate.getTime() < now.getTime();
    const kind = isExpired ? "expired" : "expiring_soon";
    const days = Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000);

    const vehicleLabel = c.vehicleName
      ? `${c.vehicleName} (${c.vehiclePlateNumber ?? "—"})`
      : "vehicle";

    const message = isExpired
      ? `${c.name} for ${vehicleLabel} expired on ${formatDate(c.endDate)}.`
      : `${c.name} for ${vehicleLabel} expires in ${days} day${days === 1 ? "" : "s"} (${formatDate(c.endDate)}).`;

    await db.insert(notificationsTable).values({
      companyId: c.companyId,
      documentId: c.id,
      kind,
      message,
    });

    await db
      .update(documentsTable)
      .set({ notifiedAt: sql`now()` })
      .where(eq(documentsTable.id, c.id));

    createdAlerts.push({
      companyId: c.companyId,
      documentId: c.id,
      kind,
      message,
    });

    logger.info(
      { documentId: c.id, companyId: c.companyId, kind },
      `[expiry-job] notify: ${message}`,
    );
  }

  if (isTelegramConfigured() && createdAlerts.length > 0) {
    try {
      await sendTelegramMessage(buildTelegramSummary(createdAlerts));

      logger.info(
        { created: createdAlerts.length },
        "[expiry-job] telegram summary sent",
      );
    } catch (err) {
      logger.error(
        { err },
        "[expiry-job] telegram summary failed",
      );
    }
  }

  return { created: candidates.length };
}

export function scheduleExpiryJob(): void {
  // Run shortly after boot so notifications appear without waiting.
  setTimeout(() => {
    runExpiryNotificationJob()
      .then((r) => logger.info({ created: r.created }, "[expiry-job] startup run complete"))
      .catch((err) => logger.error({ err }, "[expiry-job] startup run failed"));
  }, 5_000);

  // Then run three times a day at 06:00, 12:00, and 18:00 server time.
  cron.schedule("0 6,12,18 * * *", () => {
    runExpiryNotificationJob()
      .then((r) => logger.info({ created: r.created }, "[expiry-job] scheduled run complete"))
      .catch((err) => logger.error({ err }, "[expiry-job] scheduled run failed"));
  });
}