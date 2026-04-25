import { pgTable, varchar, text, uuid, timestamp, index, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./users";
import { documentsTable } from "./documents";

export const notificationKindEnum = pgEnum("notification_kind", ["expiring_soon", "expired"]);

export const notificationsTable = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => documentsTable.id, { onDelete: "cascade" }),
    kind: notificationKindEnum("kind").notNull(),
    message: text("message").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("notifications_company_idx").on(t.companyId),
    index("notifications_created_idx").on(t.createdAt),
  ],
);

export const notificationsRelations = relations(notificationsTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [notificationsTable.companyId],
    references: [companiesTable.id],
  }),
  document: one(documentsTable, {
    fields: [notificationsTable.documentId],
    references: [documentsTable.id],
  }),
}));

export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type Notification = typeof notificationsTable.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
