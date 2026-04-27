import {
  pgTable,
  varchar,
  uuid,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companiesTable } from "./users";

export const companyTelegramLinksTable = pgTable(
  "company_telegram_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),

    botType: varchar("bot_type", { length: 32 }).notNull(),

    telegramChatId: varchar("telegram_chat_id", { length: 128 }).notNull(),
    telegramUsername: varchar("telegram_username", { length: 255 }),
    telegramFirstName: varchar("telegram_first_name", { length: 255 }),

    isActive: boolean("is_active").notNull().default(true),

    linkedAt: timestamp("linked_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("company_telegram_links_company_bot_unique").on(t.companyId, t.botType),
    index("company_telegram_links_company_idx").on(t.companyId),
    index("company_telegram_links_chat_idx").on(t.telegramChatId),
  ],
);

export const telegramLinkCodesTable = pgTable(
  "telegram_link_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    companyId: uuid("company_id")
      .notNull()
      .references(() => companiesTable.id, { onDelete: "cascade" }),

    botType: varchar("bot_type", { length: 32 }).notNull(),
    code: varchar("code", { length: 32 }).notNull(),

    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("telegram_link_codes_code_unique").on(t.code),
    index("telegram_link_codes_company_idx").on(t.companyId),
    index("telegram_link_codes_code_idx").on(t.code),
  ],
);

export type CompanyTelegramLink = typeof companyTelegramLinksTable.$inferSelect;
export type TelegramLinkCode = typeof telegramLinkCodesTable.$inferSelect;