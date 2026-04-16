import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  router,
  publicProcedure,
  protectedProcedure,
  providerProcedure,
} from "../trpc/trpc.js";
import {
  db,
  events,
  eventSessions,
  venues,
  providers,
} from "@actimeet/database";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";

// Validation schemas
const createEventSchema = z.object({
  venueId: z.string().uuid(),
  title: z.string().min(5).max(200),
  description: z.string().optional(),
  shortDescription: z.string().max(500).optional(),
  category: z.enum(["dance", "sports", "music", "hobbies", "wellness", "other"]),
  activityType: z.string().min(2).max(100),
  tags: z.array(z.string()).optional(),
  genderMode: z.enum(["mixed", "same_gender", "open"]),
  maleCapacity: z.number().int().positive().optional(),
  femaleCapacity: z.number().int().positive().optional(),
  totalCapacity: z.number().int().positive().optional(),
  orientation: z.enum(["gay", "lesbian", "queer", "all"]).optional(),
  minAge: z.number().int().min(12).max(100).optional(),
  maxAge: z.number().int().min(12).max(100).optional(),
  priceCents: z.number().int().min(0),
  malePriceCents: z.number().int().min(0).optional(),
  femalePriceCents: z.number().int().min(0).optional(),
  refundPolicy: z.enum(["flexible", "moderate", "strict", "credit_only", "none"]).optional(),
  refundDaysBefore: z.number().int().min(0).optional(),
  sessions: z.array(
    z.object({
      sessionDate: z.string(),
      startTime: z.string(),
      endTime: z.string(),
    })
  ).min(1),
});

const searchEventsSchema = z.object({
  query: z.string().optional(),
  category: z.enum(["dance", "sports", "music", "hobbies", "wellness", "other"]).optional(),
  city: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  minDate: z.string().optional(),
  maxDate: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

/**
 * Events router
 */
export const eventsRouter = router({
  /**
   * Search/list events (public)
   */
  list: publicProcedure
    .input(searchEventsSchema)
    .query(async ({ input }) => {
      const conditions = [
        eq(events.isPublished, true),
        eq(events.isCancelled, false),
      ];

      // Category filter
      if (input.category) {
        conditions.push(eq(events.category, input.category));
      }

      // City filter
      if (input.city) {
        conditions.push(eq(venues.city, input.city));
      }

      // Search query (search in title and short description)
      if (input.query && input.query.trim()) {
        const searchTerm = `%${input.query.trim()}%`;
        conditions.push(
          or(
            ilike(events.title, searchTerm),
            ilike(events.shortDescription, searchTerm),
            ilike(events.activityType, searchTerm)
          )!
        );
      }

      // Build query
      const results = await db
        .select({
          id: events.id,
          title: events.title,
          shortDescription: events.shortDescription,
          category: events.category,
          activityType: events.activityType,
          genderMode: events.genderMode,
          maleCapacity: events.maleCapacity,
          femaleCapacity: events.femaleCapacity,
          totalCapacity: events.totalCapacity,
          maleTicketsSold: events.maleTicketsSold,
          femaleTicketsSold: events.femaleTicketsSold,
          totalTicketsSold: events.totalTicketsSold,
          priceCents: events.priceCents,
          currency: events.currency,
          coverImageUrl: events.coverImageUrl,
          minAge: events.minAge,
          maxAge: events.maxAge,
          venueName: venues.name,
          venueCity: venues.city,
        })
        .from(events)
        .innerJoin(venues, eq(events.venueId, venues.id))
        .where(and(...conditions))
        .orderBy(desc(events.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Get single event (public - limited info for non-logged-in users)
   */
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      // Get venue
      const [venue] = await db
        .select()
        .from(venues)
        .where(eq(venues.id, event.venueId))
        .limit(1);

      // Get sessions
      const sessions = await db
        .select()
        .from(eventSessions)
        .where(eq(eventSessions.eventId, event.id))
        .orderBy(eventSessions.sessionOrder);

      // Get provider
      const [provider] = await db
        .select({
          id: providers.id,
          businessName: providers.businessName,
          averageRating: providers.averageRating,
        })
        .from(providers)
        .where(eq(providers.id, event.providerId))
        .limit(1);

      // Calculate availability
      let availableSlots: { male?: number; female?: number; total?: number } = {};
      
      if (event.genderMode === "mixed") {
        availableSlots = {
          male: (event.maleCapacity ?? 0) - (event.maleTicketsSold ?? 0),
          female: (event.femaleCapacity ?? 0) - (event.femaleTicketsSold ?? 0),
        };
      } else {
        availableSlots = {
          total: (event.totalCapacity ?? 0) - (event.totalTicketsSold ?? 0),
        };
      }

      return {
        ...event,
        venue,
        sessions,
        provider,
        availableSlots,
        canSeeAttendees: !!ctx.user,
      };
    }),

  /**
   * Create event (provider only)
   */
  create: providerProcedure
    .input(createEventSchema)
    .mutation(async ({ ctx, input }) => {
      // Get provider profile
      const [provider] = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, ctx.user.id))
        .limit(1);

      if (!provider) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You must have an approved provider profile",
        });
      }

      if (provider.verificationStatus !== "approved") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your provider account is not yet approved",
        });
      }

      // Verify venue belongs to provider
      const [venue] = await db
        .select()
        .from(venues)
        .where(
          and(
            eq(venues.id, input.venueId),
            eq(venues.providerId, provider.id)
          )
        )
        .limit(1);

      if (!venue) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Venue not found or doesn't belong to you",
        });
      }

      // Validate gender mode config
      if (input.genderMode === "mixed") {
        if (!input.maleCapacity || !input.femaleCapacity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Mixed mode requires maleCapacity and femaleCapacity",
          });
        }
      } else {
        if (!input.totalCapacity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This gender mode requires totalCapacity",
          });
        }
      }

      // Create event
      const [event] = await db
        .insert(events)
        .values({
          providerId: provider.id,
          venueId: input.venueId,
          title: input.title,
          description: input.description,
          shortDescription: input.shortDescription,
          category: input.category,
          activityType: input.activityType,
          tags: input.tags ?? [],
          genderMode: input.genderMode,
          maleCapacity: input.maleCapacity,
          femaleCapacity: input.femaleCapacity,
          totalCapacity: input.totalCapacity,
          orientation: input.orientation,
          minAge: input.minAge,
          maxAge: input.maxAge,
          priceCents: input.priceCents,
          malePriceCents: input.malePriceCents,
          femalePriceCents: input.femalePriceCents,
          refundPolicy: input.refundPolicy,
          refundDaysBefore: input.refundDaysBefore,
        })
        .returning();

      if (!event) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create event",
        });
      }

      // Create sessions
      const sessionValues = input.sessions.map((session, index) => ({
        eventId: event.id,
        sessionDate: session.sessionDate,
        startTime: session.startTime,
        endTime: session.endTime,
        sessionOrder: index + 1,
      }));

      await db.insert(eventSessions).values(sessionValues);

      return { id: event.id };
    }),

  /**
   * Get events by provider (for provider dashboard)
   */
  myEvents: providerProcedure
    .input(
      z.object({
        status: z.enum(["all", "published", "draft", "cancelled"]).default("all"),
        limit: z.number().int().min(1).max(50).default(20),
        offset: z.number().int().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get provider
      const [provider] = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, ctx.user.id))
        .limit(1);

      if (!provider) {
        return [];
      }

      const conditions = [eq(events.providerId, provider.id)];

      if (input.status === "published") {
        conditions.push(eq(events.isPublished, true));
        conditions.push(eq(events.isCancelled, false));
      } else if (input.status === "draft") {
        conditions.push(eq(events.isPublished, false));
      } else if (input.status === "cancelled") {
        conditions.push(eq(events.isCancelled, true));
      }

      const results = await db
        .select()
        .from(events)
        .where(and(...conditions))
        .orderBy(desc(events.createdAt))
        .limit(input.limit)
        .offset(input.offset);

      return results;
    }),

  /**
   * Publish event
   */
  publish: providerProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const [provider] = await db
        .select()
        .from(providers)
        .where(eq(providers.userId, ctx.user.id))
        .limit(1);

      if (!provider) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Provider profile not found",
        });
      }

      const [event] = await db
        .select()
        .from(events)
        .where(
          and(
            eq(events.id, input.id),
            eq(events.providerId, provider.id)
          )
        )
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      await db
        .update(events)
        .set({
          isPublished: true,
          publishedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(events.id, input.id));

      return { success: true };
    }),
});
