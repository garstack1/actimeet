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
  tickets,
  users,
} from "@actimeet/database";
import { eq, and, desc, sql, ilike, or } from "drizzle-orm";

const searchEventsSchema = z.object({
  query: z.string().optional(),
  category: z.enum(["dance", "sports", "music", "hobbies", "wellness", "other"]).optional(),
  city: z.string().optional(),
  limit: z.number().int().min(1).max(100).default(50),
  offset: z.number().int().min(0).default(0),
});

export const eventsRouter = router({
  list: publicProcedure
    .input(searchEventsSchema)
    .query(async ({ input }) => {
      const conditions = [
        eq(events.isPublished, true),
        eq(events.isCancelled, false),
      ];

      if (input.category) {
        conditions.push(eq(events.category, input.category));
      }

      if (input.city) {
        conditions.push(eq(venues.city, input.city));
      }

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

  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.id))
        .limit(1);

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      const [venue] = await db
        .select()
        .from(venues)
        .where(eq(venues.id, event.venueId))
        .limit(1);

      const sessions = await db
        .select()
        .from(eventSessions)
        .where(eq(eventSessions.eventId, event.id))
        .orderBy(eventSessions.sessionOrder);

      const [provider] = await db
        .select({
          id: providers.id,
          businessName: providers.businessName,
          averageRating: providers.averageRating,
        })
        .from(providers)
        .where(eq(providers.id, event.providerId))
        .limit(1);

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

  getAttendees: publicProcedure
    .input(z.object({ eventId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
      }

      let canSeeDetails = false;

      if (ctx.user) {
        const [ticket] = await db
          .select()
          .from(tickets)
          .where(
            and(
              eq(tickets.eventId, input.eventId),
              eq(tickets.userId, ctx.user.id),
              eq(tickets.status, "active")
            )
          )
          .limit(1);

        canSeeDetails = !!ticket || ctx.user.subscriptionTier === "pro";
      }

      const attendeeTickets = await db
        .select({
          odisplayId: users.id,
          odisplayName: users.displayName,
          odisplayPhotos: users.photos,
          odisplayGender: users.gender,
          odisplayCity: users.city,
          genderSlot: tickets.genderSlot,
        })
        .from(tickets)
        .innerJoin(users, eq(tickets.userId, users.id))
        .where(
          and(
            eq(tickets.eventId, input.eventId),
            eq(tickets.status, "active")
          )
        );

      if (!canSeeDetails) {
        return {
          canSeeDetails: false,
          count: attendeeTickets.length,
          maleCount: attendeeTickets.filter(a => a.genderSlot === "male").length,
          femaleCount: attendeeTickets.filter(a => a.genderSlot === "female").length,
          attendees: [],
        };
      }

      return {
        canSeeDetails: true,
        count: attendeeTickets.length,
        maleCount: attendeeTickets.filter(a => a.genderSlot === "male").length,
        femaleCount: attendeeTickets.filter(a => a.genderSlot === "female").length,
        attendees: attendeeTickets.map(a => ({
          id: a.odisplayId,
          displayName: a.odisplayName,
          photos: a.odisplayPhotos,
          gender: a.odisplayGender,
          city: a.odisplayCity,
          genderSlot: a.genderSlot,
        })),
      };
    }),
});
