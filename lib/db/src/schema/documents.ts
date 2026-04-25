import { pgTable, varchar, text, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const documentsTable = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    number: varchar("number", { length: 128 }).notNull(),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    endDate: timestamp("end_date", { withTimezone: true }).notNull(),
    note: text("note"),
    fileUrl: text("file_url"),
    fileName: varchar("file_name", { length: 255 }),
    notifiedAt: timestamp("notified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("documents_company_idx").on(t.companyId),
    index("documents_vehicle_idx").on(t.vehicleId),
    index("documents_end_date_idx").on(t.endDate),
  ],
);

export const documentsRelations = relations(documentsTable, ({ one }) => ({
  vehicle: one(vehiclesTable, {
    fields: [documentsTable.vehicleId],
    references: [vehiclesTable.id],
  }),
  company: one(companiesTable, {
    fields: [documentsTable.companyId],
    references: [companiesTable.id],
  }),
}));

export const insertDocumentSchema = createInsertSchema(documentsTable).omit({ id: true, createdAt: true });
export type DocumentRow = typeof documentsTable.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;
