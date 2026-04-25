import { pgTable, varchar, integer, uuid, timestamp, index } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { companiesTable } from "./users";

export const vehiclesTable = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    plateNumber: varchar("plate_number", { length: 64 }).notNull(),
    vinCode: varchar("vin_code", { length: 64 }).notNull(),
    year: integer("year").notNull(),
    techPassportSeries: varchar("tech_passport_series", { length: 128 }),
    driverName: varchar("driver_name", { length: 255 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("vehicles_company_idx").on(t.companyId)],
);

export const vehiclesRelations = relations(vehiclesTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [vehiclesTable.companyId],
    references: [companiesTable.id],
  }),
}));

export const insertVehicleSchema = createInsertSchema(vehiclesTable).omit({ id: true, createdAt: true });
export type Vehicle = typeof vehiclesTable.$inferSelect;
export type InsertVehicle = z.infer<typeof insertVehicleSchema>;
