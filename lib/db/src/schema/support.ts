import { pgTable, varchar, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { companiesTable } from "./users";

export const supportTicketsTable = pgTable(
  "support_tickets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),

    subject: varchar("subject", { length: 255 }).notNull(),
    status: varchar("status", { length: 32 }).notNull().default("open"),
    priority: varchar("priority", { length: 32 }).notNull().default("normal"),

    createdByUserId: uuid("created_by_user_id"),
    createdByEmail: varchar("created_by_email", { length: 255 }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("support_tickets_company_idx").on(t.companyId),
    index("support_tickets_status_idx").on(t.status),
  ],
);

export const supportMessagesTable = pgTable(
  "support_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    ticketId: uuid("ticket_id")
      .notNull()
      .references(() => supportTicketsTable.id, { onDelete: "cascade" }),

    senderRole: varchar("sender_role", { length: 32 }).notNull(),
    senderEmail: varchar("sender_email", { length: 255 }),
    body: text("body").notNull(),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("support_messages_ticket_idx").on(t.ticketId)],
);

export const supportTicketsRelations = relations(supportTicketsTable, ({ one, many }) => ({
  company: one(companiesTable, {
    fields: [supportTicketsTable.companyId],
    references: [companiesTable.id],
  }),
  messages: many(supportMessagesTable),
}));

export const supportMessagesRelations = relations(supportMessagesTable, ({ one }) => ({
  ticket: one(supportTicketsTable, {
    fields: [supportMessagesTable.ticketId],
    references: [supportTicketsTable.id],
  }),
}));

export type SupportTicket = typeof supportTicketsTable.$inferSelect;
export type SupportMessage = typeof supportMessagesTable.$inferSelect;