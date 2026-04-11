import { pgEnum } from "drizzle-orm/pg-core";

// User roles
export const userRoleEnum = pgEnum("user_role", ["user", "provider", "admin"]);

// Subscription tiers
export const subscriptionTierEnum = pgEnum("subscription_tier", ["free", "pro"]);

// Provider verification status
export const verificationStatusEnum = pgEnum("verification_status", [
  "pending",
  "approved",
  "rejected",
  "suspended",
]);

// Event gender modes
export const genderModeEnum = pgEnum("gender_mode", [
  "mixed",
  "same_gender",
  "open",
]);

// Orientation tags for same_gender events
export const orientationTagEnum = pgEnum("orientation_tag", [
  "gay",
  "lesbian",
  "queer",
  "all",
]);

// Activity categories
export const activityCategoryEnum = pgEnum("activity_category", [
  "dance",
  "sports",
  "music",
  "hobbies",
  "wellness",
  "other",
]);

// Ticket status
export const ticketStatusEnum = pgEnum("ticket_status", [
  "active",
  "used",
  "cancelled",
  "refunded",
  "expired",
]);

// Payment status
export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "disputed",
]);

// Refund policy types
export const refundPolicyEnum = pgEnum("refund_policy", [
  "flexible",
  "moderate",
  "strict",
  "credit_only",
  "none",
]);

// Connection status between users
export const connectionStatusEnum = pgEnum("connection_status", [
  "active",
  "blocked",
]);

// Message type
export const messageTypeEnum = pgEnum("message_type", ["direct", "event_chat"]);

// Subscription billing period
export const billingPeriodEnum = pgEnum("billing_period", ["monthly", "annual"]);
