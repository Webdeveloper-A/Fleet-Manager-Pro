import { pgTable, text, timestamp, uuid, varchar, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const userRoleEnum = pgEnum("user_role", ["admin", "company"]);

export const companiesTable = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  contactName: varchar("contact_name", { length: 255 }),
  phone: varchar("phone", { length: 64 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const usersTable = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("company"),
  companyId: uuid("company_id").references(() => companiesTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const companiesRelations = relations(companiesTable, ({ many }) => ({
  users: many(usersTable),
}));

export const usersRelations = relations(usersTable, ({ one }) => ({
  company: one(companiesTable, {
    fields: [usersTable.companyId],
    references: [companiesTable.id],
  }),
}));

export const insertCompanySchema = createInsertSchema(companiesTable).omit({ id: true, createdAt: true });
export const insertUserSchema = createInsertSchema(usersTable).omit({ id: true, createdAt: true });

export type Company = typeof companiesTable.$inferSelect;
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type User = typeof usersTable.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
