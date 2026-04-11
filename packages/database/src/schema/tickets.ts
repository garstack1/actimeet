import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  index,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { events } from "./events.js";
import { providers } from "./providers.js";
import { ticketStatusEnum, paymentStatusEnum } from "./enums.js";

export const tickets = pgTable(
  "tickets",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Ticket details
    ticketNumber: varchar("ticket_number", { length: 20 }).notNull().unique(),
    qrCodeData: text("qr_code_data").notNull(),

    // Gender slot
    genderSlot: varchar("gender_slot", { length: 10 }),

    // Pricing at time of purchase
    amountPaidCents: integer("amount_paid_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Status
    status: ticketStatusEnum("status").default("active"),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
    checkedInBy: uuid("checked_in_by").references(() => users.id),

    // Refund info
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    refundAmountCents: integer("refund_amount_cents"),
    refundReason: text("refund_reason"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_tickets_event_id: index("idx_tickets_event_id").on(table.eventId),
    idx_tickets_user_id: index("idx_tickets_user_id").on(table.userId),
    idx_tickets_status: index("idx_tickets_status").on(table.status),
    idx_tickets_ticket_number: index("idx_tickets_ticket_number").on(table.ticketNumber),
  })
);

export const payments = pgTable(
  "payments",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    ticketId: uuid("ticket_id").references(() => tickets.id, {
      onDelete: "set null",
    }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // What was paid for
    paymentType: varchar("payment_type", { length: 50 }).notNull(),

    // Stripe
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 100 }),
    stripeChargeId: varchar("stripe_charge_id", { length: 100 }),

    // Amounts (in cents)
    amountCents: integer("amount_cents").notNull(),
    platformFeeCents: integer("platform_fee_cents").notNull(),
    providerAmountCents: integer("provider_amount_cents"),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Status
    status: paymentStatusEnum("status").default("pending"),

    // Error handling
    failureReason: text("failure_reason"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    idx_payments_ticket_id: index("idx_payments_ticket_id").on(table.ticketId),
    idx_payments_user_id: index("idx_payments_user_id").on(table.userId),
    idx_payments_stripe_payment_intent: index("idx_payments_stripe_payment_intent").on(table.stripePaymentIntentId),
    idx_payments_status: index("idx_payments_status").on(table.status),
  })
);

export const providerPayouts = pgTable(
  "provider_payouts",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    providerId: uuid("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "restrict" }),

    // Stripe transfer
    stripeTransferId: varchar("stripe_transfer_id", { length: 100 }),

    // Amount
    amountCents: integer("amount_cents").notNull(),
    currency: varchar("currency", { length: 3 }).default("EUR"),

    // Period
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),

    // Status
    status: varchar("status", { length: 50 }).default("pending"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => ({
    idx_provider_payouts_provider_id: index("idx_provider_payouts_provider_id").on(table.providerId),
    idx_provider_payouts_status: index("idx_provider_payouts_status").on(table.status),
  })
);

export type Ticket = typeof tickets.$inferSelect;
export type NewTicket = typeof tickets.$inferInsert;
export type Payment = typeof payments.$inferSelect;
export type NewPayment = typeof payments.$inferInsert;
export type ProviderPayout = typeof providerPayouts.$inferSelect;
export type NewProviderPayout = typeof providerPayouts.$inferInsert;
