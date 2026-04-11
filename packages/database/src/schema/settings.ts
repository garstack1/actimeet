import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { providers } from "./providers.js";
import { subscriptionTierEnum, billingPeriodEnum } from "./enums.js";

export const platformSettings = pgTable("platform_settings", {
  key: varchar("key", { length: 100 }).primaryKey(),
  value: jsonb("value").notNull(),
  description: text("description"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  updatedBy: uuid("updated_by").references(() => users.id),
});

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Subscription details
    tier: subscriptionTierEnum("tier").notNull(),
    billingPeriod: billingPeriodEnum("billing_period").notNull(),

    // Stripe
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),

    // Dates
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    // Trial
    trialEndsAt: timestamp("trial_ends_at", { withTimezone: true }),

    // Status
    isActive: boolean("is_active").default(true),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_user_subscriptions_user: index("idx_user_subscriptions_user").on(table.userId),
    idx_user_subscriptions_stripe: index("idx_user_subscriptions_stripe").on(table.stripeSubscriptionId),
  })
);

export const providerSubscriptions = pgTable(
  "provider_subscriptions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),

    // Subscription details
    billingPeriod: billingPeriodEnum("billing_period").notNull(),

    // Stripe
    stripeSubscriptionId: varchar("stripe_subscription_id", { length: 100 }),
    stripeCustomerId: varchar("stripe_customer_id", { length: 100 }),

    // Dates
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow(),
    currentPeriodStart: timestamp("current_period_start", {
      withTimezone: true,
    }),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    // Status
    isActive: boolean("is_active").default(true),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_provider_subscriptions_provider: index("idx_provider_subscriptions_provider").on(table.providerId),
  })
);

export type PlatformSetting = typeof platformSettings.$inferSelect;
export type NewPlatformSetting = typeof platformSettings.$inferInsert;
export type UserSubscription = typeof userSubscriptions.$inferSelect;
export type NewUserSubscription = typeof userSubscriptions.$inferInsert;
export type ProviderSubscription = typeof providerSubscriptions.$inferSelect;
export type NewProviderSubscription = typeof providerSubscriptions.$inferInsert;
