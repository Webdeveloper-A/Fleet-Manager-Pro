import { pgTable, varchar, uuid, timestamp, text, index } from "drizzle-orm/pg-core";
import { companiesTable } from "./users";
import { vehiclesTable } from "./vehicles";

export const dazvolsTable = pgTable(
  "dazvols",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),

    vehicleId: uuid("vehicle_id").references(() => vehiclesTable.id, {
      onDelete: "set null",
    }),

    permitNumber: varchar("permit_number", { length: 128 }).notNull(),
    country: varchar("country", { length: 128 }).notNull(),
    permitType: varchar("permit_type", { length: 64 }).notNull().default("bilateral"),

    issueDate: timestamp("issue_date", { withTimezone: true }),
    expiryDate: timestamp("expiry_date", { withTimezone: true }),

    status: varchar("status", { length: 32 }).notNull().default("active"),
    note: text("note"),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("dazvols_company_idx").on(t.companyId),
    index("dazvols_vehicle_idx").on(t.vehicleId),
    index("dazvols_status_idx").on(t.status),
  ],
);

export type Dazvol = typeof dazvolsTable.$inferSelect;
export type NewDazvol = typeof dazvolsTable.$inferInsert;