import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  decimal,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { verificationStatusEnum } from "./enums.js";

export const providers = pgTable(
  "providers",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),

    // Business details
    businessName: varchar("business_name", { length: 200 }).notNull(),
    businessDescription: text("business_description"),
    businessEmail: varchar("business_email", { length: 255 }),
    businessPhone: varchar("business_phone", { length: 50 }),
    websiteUrl: varchar("website_url", { length: 500 }),

    // Verification
    verificationStatus: verificationStatusEnum("verification_status").default(
      "pending"
    ),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    rejectionReason: text("rejection_reason"),

    // Stripe Connect
    stripeAccountId: varchar("stripe_account_id", { length: 100 }),
    stripeOnboardingComplete: boolean("stripe_onboarding_complete").default(
      false
    ),

    // Commission
    customCommissionRate: decimal("custom_commission_rate", {
      precision: 4,
      scale: 3,
    }),
    isProProvider: boolean("is_pro_provider").default(false),

    // Stats (denormalised)
    totalEventsHosted: integer("total_events_hosted").default(0),
    totalTicketsSold: integer("total_tickets_sold").default(0),
    averageRating: decimal("average_rating", { precision: 3, scale: 2 }),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    userIdIdx: index("idx_providers_user_id").on(table.userId),
    verificationStatusIdx: index("idx_providers_verification_status").on(table.verificationStatus),
    stripeAccountIdx: index("idx_providers_stripe_account").on(table.stripeAccountId),
  })
);

export const venues = pgTable(
  "venues",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),

    // Details
    name: varchar("name", { length: 200 }).notNull(),
    description: text("description"),
    addressLine1: varchar("address_line1", { length: 255 }).notNull(),
    addressLine2: varchar("address_line2", { length: 255 }),
    city: varchar("city", { length: 100 }).notNull(),
    county: varchar("county", { length: 100 }),
    postcode: varchar("postcode", { length: 20 }),
    countryCode: varchar("country_code", { length: 2 }).notNull().default("IE"),

    // Note: location is a PostGIS geography column - we'll use raw SQL for geo queries
    // Not included here as Drizzle doesn't have native PostGIS support

    // Facilities
    facilities: text("facilities").array().default(sql`'{}'`),

    // Photos
    photos: text("photos").array().default(sql`'{}'`),

    // Status
    isActive: boolean("is_active").default(true),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    providerIdIdx: index("idx_venues_provider_id").on(table.providerId),
    cityIdx: index("idx_venues_city").on(table.city),
  })
);

import { index } from "drizzle-orm/pg-core";

export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
