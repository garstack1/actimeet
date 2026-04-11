import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users.js";
import { events } from "./events.js";
import { connectionStatusEnum, messageTypeEnum } from "./enums.js";

export const connections = pgTable(
  "connections",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // The event that created this connection
    sourceEventId: uuid("source_event_id").references(() => events.id, {
      onDelete: "set null",
    }),

    // Status
    status: connectionStatusEnum("status").default("active"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_connections_user_a: index("idx_connections_user_a").on(table.userAId),
    idx_connections_user_b: index("idx_connections_user_b").on(table.userBId),
    idx_connections_event: index("idx_connections_event").on(table.sourceEventId),
  })
);

export const blocks = pgTable(
  "blocks",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    blockerId: uuid("blocker_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    blockedId: uuid("blocked_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Reason
    reason: text("reason"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_blocks_blocker: index("idx_blocks_blocker").on(table.blockerId),
    idx_blocks_blocked: index("idx_blocks_blocked").on(table.blockedId),
  })
);

export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    userAId: uuid("user_a_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userBId: uuid("user_b_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Source event
    sourceEventId: uuid("source_event_id").references(() => events.id, {
      onDelete: "set null",
    }),

    // Last activity
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    lastMessagePreview: text("last_message_preview"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_conversations_user_a: index("idx_conversations_user_a").on(table.userAId),
    idx_conversations_user_b: index("idx_conversations_user_b").on(table.userBId),
    idx_conversations_last_message: index("idx_conversations_last_message").on(table.lastMessageAt),
  })
);

export const messages = pgTable(
  "messages",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),

    // Type and context
    messageType: messageTypeEnum("message_type").notNull(),

    // For DMs
    conversationId: uuid("conversation_id").references(() => conversations.id, {
      onDelete: "cascade",
    }),

    // For event chat
    eventId: uuid("event_id").references(() => events.id, {
      onDelete: "cascade",
    }),

    // Sender
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Content
    content: text("content").notNull(),

    // Status
    isDeleted: boolean("is_deleted").default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => ({
    idx_messages_conversation: index("idx_messages_conversation").on(table.conversationId),
    idx_messages_event: index("idx_messages_event").on(table.eventId),
    idx_messages_sender: index("idx_messages_sender").on(table.senderId),
  })
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`uuid_generate_v4()`),
    reporterId: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportedUserId: uuid("reported_user_id").references(() => users.id, {
      onDelete: "cascade",
    }),
    reportedEventId: uuid("reported_event_id").references(() => events.id, {
      onDelete: "cascade",
    }),
    reportedMessageId: uuid("reported_message_id").references(
      () => messages.id,
      { onDelete: "cascade" }
    ),

    // Report details
    reason: varchar("reason", { length: 100 }).notNull(),
    description: text("description"),

    // Moderation
    status: varchar("status", { length: 50 }).default("pending"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    actionTaken: text("action_taken"),

    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => ({
    idx_reports_reporter: index("idx_reports_reporter").on(table.reporterId),
    idx_reports_reported_user: index("idx_reports_reported_user").on(table.reportedUserId),
    idx_reports_status: index("idx_reports_status").on(table.status),
  })
);

export type Connection = typeof connections.$inferSelect;
export type NewConnection = typeof connections.$inferInsert;
export type Block = typeof blocks.$inferSelect;
export type NewBlock = typeof blocks.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
