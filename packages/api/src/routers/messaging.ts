import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db } from "@actimeet/database";
import { conversations, messages, connections, users, blocks } from "@actimeet/database";
import { eq, and, or, desc, gt, sql } from "drizzle-orm";

export const messagingRouter = router({
  /**
   * Get all conversations for current user
   */
  getConversations: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const results = await db
      .select({
        id: conversations.id,
        otherUserId: sql<string>`CASE WHEN ${conversations.userAId} = ${userId} THEN ${conversations.userBId} ELSE ${conversations.userAId} END`,
        lastMessageAt: conversations.lastMessageAt,
        lastMessagePreview: conversations.lastMessagePreview,
      })
      .from(conversations)
      .where(
        or(
          eq(conversations.userAId, userId),
          eq(conversations.userBId, userId)
        )
      )
      .orderBy(desc(conversations.lastMessageAt));

    // Get other user details
    const conversationsWithUsers = await Promise.all(
      results.map(async (conv) => {
        const [otherUser] = await db
          .select({
            id: users.id,
            displayName: users.displayName,
            photos: users.photos,
          })
          .from(users)
          .where(eq(users.id, conv.otherUserId))
          .limit(1);

        return {
          id: conv.id,
          lastMessageAt: conv.lastMessageAt,
          lastMessagePreview: conv.lastMessagePreview,
          otherUser: otherUser || null,
        };
      })
    );

    return conversationsWithUsers;
  }),

  /**
   * Get or create a conversation with another user
   */
  getOrCreateConversation: protectedProcedure
    .input(z.object({ otherUserId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;
      const { otherUserId } = input;

      if (userId === otherUserId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot message yourself",
        });
      }

      // Check if blocked
      const [blocked] = await db
        .select()
        .from(blocks)
        .where(
          or(
            and(eq(blocks.blockerId, userId), eq(blocks.blockedId, otherUserId)),
            and(eq(blocks.blockerId, otherUserId), eq(blocks.blockedId, userId))
          )
        )
        .limit(1);

      if (blocked) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Cannot message this user",
        });
      }

      // Check if they share an event (connection exists)
      const [userAId, userBId] = userId < otherUserId ? [userId, otherUserId] : [otherUserId, userId];
      
      const [connection] = await db
        .select()
        .from(connections)
        .where(
          and(
            eq(connections.userAId, userAId),
            eq(connections.userBId, userBId)
          )
        )
        .limit(1);

      if (!connection) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only message people you've shared an event with",
        });
      }

      // Check for existing conversation
      const [existing] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.userAId, userAId),
            eq(conversations.userBId, userBId)
          )
        )
        .limit(1);

      if (existing) {
        return { conversationId: existing.id };
      }

      // Create new conversation
      const [newConv] = await db
        .insert(conversations)
        .values({
          userAId,
          userBId,
        })
        .returning();

      return { conversationId: newConv!.id };
    }),

  /**
   * Get messages for a conversation
   */
  getMessages: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      cursor: z.string().datetime().optional(),
      limit: z.number().min(1).max(50).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user is part of conversation
      const [conv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            or(
              eq(conversations.userAId, userId),
              eq(conversations.userBId, userId)
            )
          )
        )
        .limit(1);

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Get messages
      let query = db
        .select({
          id: messages.id,
          senderId: messages.senderId,
          content: messages.content,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(input.limit);

      const results = await query;

      return {
        messages: results.reverse(), // Return in chronological order
        otherUserId: conv.userAId === userId ? conv.userBId : conv.userAId,
      };
    }),

  /**
   * Send a message
   */
  sendMessage: protectedProcedure
    .input(z.object({
      conversationId: z.string().uuid(),
      content: z.string().min(1).max(2000),
    }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      // Verify user is part of conversation
      const [conv] = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            or(
              eq(conversations.userAId, userId),
              eq(conversations.userBId, userId)
            )
          )
        )
        .limit(1);

      if (!conv) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Conversation not found",
        });
      }

      // Create message
      const [message] = await db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: userId,
          content: input.content,
          messageType: "direct",
        })
        .returning();

      // Update conversation
      await db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          lastMessagePreview: input.content.slice(0, 100),
          updatedAt: new Date(),
        })
        .where(eq(conversations.id, input.conversationId));

      return message;
    }),

  /**
   * Get users you can message (connections)
   */
  getConnections: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const results = await db
      .select({
        odisplayName: users.displayName,
        odisplayPhotos: users.photos,
        odisplayId: users.id,
        sourceEventId: connections.sourceEventId,
      })
      .from(connections)
      .innerJoin(
        users,
        or(
          and(eq(connections.userAId, userId), eq(users.id, connections.userBId)),
          and(eq(connections.userBId, userId), eq(users.id, connections.userAId))
        )
      )
      .where(
        or(
          eq(connections.userAId, userId),
          eq(connections.userBId, userId)
        )
      );

    return results.map(r => ({
      id: r.odisplayId,
      displayName: r.odisplayName,
      photos: r.odisplayPhotos,
      sourceEventId: r.sourceEventId,
    }));
  }),
});
