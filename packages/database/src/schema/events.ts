import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  date,
  time,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { providers, venues } from "./providers.js";
import {
  genderModeEnum,
  orientationTagEnum,
  activityCategoryEnum,
  refundPolicyEnum,
} from "./enums.js";

export const events = pgTable(
  "events",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    venueId: uuid("venue_id")
      .notNull()
      .references(() => venues.id, { onDelete: "restrict" }),

    // Basic info
    title: varchar("title", { length: 200 }).notNull(),
    description: text("description"),
    shortDescription: varchar("short_description", { length: 500 }),

    // Categorisation
    category: activityCategoryEnum("category").notNull(),
    activityType: varchar("activity_type", { length: 100 }).notNull(),
    tags: text("tags").array().default(sql`'{}'`),

    // Gender configuration
    genderMode: genderModeEnum("gender_mode").notNull().default("mixed"),
    maleCapacity: integer("male_capacity"),
    femaleCapacity: integer("female_capacity"),
    totalCapacity: integer("total_capacity"),
    orientation: orientationTagEnum("orientation"),

    // Age restrictions
    minAge: integer("min_age"),
    maxAge: integer("max_age"),

    // Pricing (in cents)
    priceCents: integer("price_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),
    malePriceCents: integer("male_price_cents"),
    femalePriceCents: integer("female_price_cents"),

    // Refunds
    refundPolicy: refundPolicyEnum("refund_policy").default("moderate"),
    refundDaysBefore: integer("refund_days_before").default(7),

    // Media
    coverImageUrl: text("cover_image_url"),
    images: text("images").array().default(sql`'{}'`),

    // Status
    isPublished: boolean("is_published").default(false),
    isFeatured: boolean("is_featured").default(false),
    isCancelled: boolean("is_cancelled").default(false),
    cancellationReason: text("cancellation_reason"),

    // Listing fee
    listingFeePaid: boolean("listing_fee_paid").default(false),
    listingFeePaymentId: varchar("listing_fee_payment_id", { length: 100 }),

    // Stats (denormalised)
    maleTicketsSold: integer("male_tickets_sold").default(0),
    femaleTicketsSold: integer("female_tickets_sold").default(0),
    totalTicketsSold: integer("total_tickets_sold").default(0),

    // Cloning reference
    clonedFromEventId: uuid("cloned_from_event_id"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (table) => ({
    idx_events_provider_id: index("idx_events_provider_id").on(table.providerId),
    idx_events_venue_id: index("idx_events_venue_id").on(table.venueId),
    idx_events_category: index("idx_events_category").on(table.category),
    idx_events_activity_type: index("idx_events_activity_type").on(table.activityType),
  })
);

export const eventSessions = pgTable(
  "event_sessions",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),

    // Timing
    sessionDate: date("session_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    timezone: varchar("timezone", { length: 50 }).default("Europe/Dublin"),

    // Session-specific overrides
    overrideVenueId: uuid("override_venue_id").references(() => venues.id),

    // Status
    isCancelled: boolean("is_cancelled").default(false),
    cancellationReason: text("cancellation_reason"),

    // Order
    sessionOrder: integer("session_order").notNull().default(1),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_event_sessions_event_id: index("idx_event_sessions_event_id").on(table.eventId),
    idx_event_sessions_date: index("idx_event_sessions_date").on(table.sessionDate),
  })
);

export type Event = typeof events.$inferSelect;
export type NewEvent = typeof events.$inferInsert;
export type EventSession = typeof eventSessions.$inferSelect;
export type NewEventSession = typeof eventSessions.$inferInsert;
