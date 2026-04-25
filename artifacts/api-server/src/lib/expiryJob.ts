import cron from "node-cron";
import { db } from "@workspace/db";
import { documentsTable, notificationsTable, vehiclesTable } from "@workspace/db/schema";
import { and, eq, isNull, lte, sql } from "drizzle-orm";
import { logger } from "./logger";
import { NOTIFY_THRESHOLD_DAYS } from "./status";

/**
 * Find documents expiring within NOTIFY_THRESHOLD_DAYS that haven't been
 * notified yet, and create one notification per such document. In a
 * production system this would also dispatch email — here we record the
 * event in the notifications table so the company sees it in the UI.
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

  for (const c of candidates) {
    const isExpired = c.endDate.getTime() < now.getTime();
    const kind = isExpired ? "expired" : "expiring_soon";
    const days = Math.ceil((c.endDate.getTime() - now.getTime()) / 86400000);
    const vehicleLabel = c.vehicleName
      ? `${c.vehicleName} (${c.vehiclePlateNumber ?? "—"})`
      : "vehicle";
    const message = isExpired
      ? `${c.name} for ${vehicleLabel} expired on ${c.endDate.toISOString().slice(0, 10)}.`
      : `${c.name} for ${vehicleLabel} expires in ${days} day${days === 1 ? "" : "s"} (${c.endDate.toISOString().slice(0, 10)}).`;

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

    logger.info(
      { documentId: c.id, companyId: c.companyId, kind },
      `[expiry-job] notify: ${message}`,
    );
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
