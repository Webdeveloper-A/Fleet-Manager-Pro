import { pgTable, varchar, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
import { companiesTable } from "./users";
import { vehiclesTable } from "./vehicles";
import { companiesTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const tirCarnetsTable = pgTable(
  "tir_carnets",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),

    vehicleId: uuid("vehicle_id")
      .notNull()
      .references(() => vehiclesTable.id, { onDelete: "cascade" }),

    carnetNumber: varchar("carnet_number", { length: 128 }).notNull(),
    route: varchar("route", { length: 255 }),

    issueDate: timestamp("issue_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),

    status: varchar("status", { length: 32 }).notNull().default("active"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("tir_carnets_company_idx").on(t.companyId),
    index("tir_carnets_vehicle_idx").on(t.vehicleId),
    index("tir_carnets_status_idx").on(t.status),
  ],
);

export type TirCarnet = typeof tirCarnetsTable.$inferSelect;
export type NewTirCarnet = typeof tirCarnetsTable.$inferInsert;