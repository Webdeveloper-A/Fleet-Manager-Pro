import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";

export const adsTable = pgTable(
  "ads",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),

    imageUrl: text("image_url").notNull(),
    targetUrl: text("target_url"),

    placement: varchar("placement", { length: 32 }).notNull().default("ads-page"),
    isActive: boolean("is_active").notNull().default(true),

    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),

    sortOrder: integer("sort_order").notNull().default(0),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("ads_active_idx").on(t.isActive),
    index("ads_placement_idx").on(t.placement),
    index("ads_sort_order_idx").on(t.sortOrder),
  ],
);

export type Ad = typeof adsTable.$inferSelect;
export type NewAd = typeof adsTable.$inferInsert;