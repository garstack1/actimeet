import {
  pgTable,
  uuid,
  varchar,
  text,
  date,
  boolean,
  timestamp,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { userRoleEnum, subscriptionTierEnum } from "./enums.js";

export const users = pgTable(
  "users",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),

    // Profile fields
    displayName: varchar("display_name", { length: 100 }).notNull(),
    bio: text("bio"),
    dateOfBirth: date("date_of_birth"),
    gender: varchar("gender", { length: 20 }),
    showExactAge: boolean("show_exact_age").default(false),

    // Photos stored as array of URLs
    photos: text("photos")
      .array()
      .default(sql`'{}'`),
    profilePhotoIndex: integer("profile_photo_index").default(0),

    // Location
    city: varchar("city", { length: 100 }),
    countryCode: varchar("country_code", { length: 2 }),

    // Account status
    role: userRoleEnum("role").default("user"),
    subscriptionTier: subscriptionTierEnum("subscription_tier").default("free"),
    emailVerified: boolean("email_verified").default(false),
    isActive: boolean("is_active").default(true),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  },
  (table) => ({
    idx_users_email: index("idx_users_email").on(table.email),
    idx_users_city_country: index("idx_users_city_country").on(table.city, table.countryCode),
    idx_users_role: index("idx_users_role").on(table.role),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
