import { z } from "zod";
import { TRPCError } from "@trpc/server";
import crypto from "crypto";
import { router, protectedProcedure } from "../trpc/trpc.js";
import { db, events, tickets, users, connections } from "@actimeet/database";
import { eq, and, or, desc } from "drizzle-orm";

/**
 * Generate ticket number: ACT-XXXX-XXXX
 */
function generateTicketNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // Removed confusing chars
  let result = "ACT-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  result += "-";
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * Generate QR code data (signed for verification)
 */
function generateQRCodeData(ticketId: string, eventId: string): string {
  const data = {
    ticketId,
    eventId,
    timestamp: Date.now(),
  };
  const secret = process.env.QR_SECRET ?? "qr-dev-secret";
  const signature = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(data))
    .digest("hex")
    .slice(0, 16);

  return Buffer.from(
    JSON.stringify({ ...data, sig: signature })
  ).toString("base64");
}

/**
 * Tickets router
 */
export const ticketsRouter = router({
  /**
   * Purchase ticket
   */
  purchase: protectedProcedure
    .input(
      z.object({
        eventId: z.string().uuid(),
        genderSlot: z.enum(["male", "female"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get event
      const [event] = await db
        .select()
        .from(events)
        .where(eq(events.id, input.eventId))
        .limit(1);

      if (!event) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Event not found",
        });
      }

      if (!event.isPublished || event.isCancelled) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "This event is not available for purchase",
        });
      }

      // Check if user already has a ticket
      const [existingTicket] = await db
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

      if (existingTicket) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You already have a ticket for this event",
        });
      }

      // Check age restrictions
      if (event.minAge || event.maxAge) {
        if (!ctx.user.dateOfBirth) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This event has age restrictions. Please update your date of birth.",
          });
        }

        const birthDate = new Date(ctx.user.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--;
        }

        if (event.minAge && age < event.minAge) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `You must be at least ${event.minAge} years old for this event`,
          });
        }
        if (event.maxAge && age > event.maxAge) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `This event is for ages ${event.minAge ?? 0}-${event.maxAge}`,
          });
        }
      }

      // Check availability and validate gender slot
      let genderSlot: string | null = null;
      let priceCents = event.priceCents;

      if (event.genderMode === "mixed") {
        if (!input.genderSlot) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Please select male or female for this event",
          });
        }

        genderSlot = input.genderSlot;

        if (input.genderSlot === "male") {
          const available = (event.maleCapacity ?? 0) - (event.maleTicketsSold ?? 0);
          if (available <= 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "No male spots available",
            });
          }
          priceCents = event.malePriceCents ?? event.priceCents;
        } else {
          const available = (event.femaleCapacity ?? 0) - (event.femaleTicketsSold ?? 0);
          if (available <= 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "No female spots available",
            });
          }
          priceCents = event.femalePriceCents ?? event.priceCents;
        }
      } else {
        const available = (event.totalCapacity ?? 0) - (event.totalTicketsSold ?? 0);
        if (available <= 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "This event is sold out",
          });
        }
      }

      // TODO: Process payment with Stripe here
      // For now, we'll skip payment and create the ticket directly

      // Create ticket
      const ticketNumber = generateTicketNumber();
      const [ticket] = await db
        .insert(tickets)
        .values({
          eventId: event.id,
          userId: ctx.user.id,
          ticketNumber,
          qrCodeData: generateQRCodeData(ticketNumber, event.id),
          genderSlot,
          amountPaidCents: priceCents,
          currency: event.currency ?? "EUR",
        })
        .returning();

      // Update ticket counts
      if (event.genderMode === "mixed") {
        if (genderSlot === "male") {
          await db
            .update(events)
            .set({
              maleTicketsSold: (event.maleTicketsSold ?? 0) + 1,
              totalTicketsSold: (event.totalTicketsSold ?? 0) + 1,
            })
            .where(eq(events.id, event.id));
        } else {
          await db
            .update(events)
            .set({
              femaleTicketsSold: (event.femaleTicketsSold ?? 0) + 1,
              totalTicketsSold: (event.totalTicketsSold ?? 0) + 1,
            })
            .where(eq(events.id, event.id));
        }
      } else {
        await db
          .update(events)
          .set({
            totalTicketsSold: (event.totalTicketsSold ?? 0) + 1,
          })
          .where(eq(events.id, event.id));
      }

      // Create connections with other attendees
      const otherTickets = await db
        .select({ userId: tickets.userId })
        .from(tickets)
        .where(
          and(
            eq(tickets.eventId, event.id),
            eq(tickets.status, "active")
          )
        );

      // Create connections (ensuring user_a_id < user_b_id)
      for (const otherTicket of otherTickets) {
        if (otherTicket.userId === ctx.user.id) continue;

        const [userAId, userBId] =
          ctx.user.id < otherTicket.userId
            ? [ctx.user.id, otherTicket.userId]
            : [otherTicket.userId, ctx.user.id];

        // Insert or ignore if already exists
        await db
          .insert(connections)
          .values({
            userAId,
            userBId,
            sourceEventId: event.id,
          })
          .onConflictDoNothing();
      }

      return {
        ticketId: ticket?.id,
        ticketNumber: ticket?.ticketNumber,
        qrCodeData: ticket?.qrCodeData,
      };
    }),

  /**
   * Get my tickets
   */
  myTickets: protectedProcedure
    .input(
      z.object({
        status: z.enum(["all", "active", "used", "cancelled"]).default("all"),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(tickets.userId, ctx.user.id)];

      if (input.status !== "all") {
        conditions.push(eq(tickets.status, input.status));
      }

      const results = await db
        .select({
          ticket: tickets,
          event: {
            id: events.id,
            title: events.title,
            category: events.category,
            activityType: events.activityType,
            coverImageUrl: events.coverImageUrl,
          },
        })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id))
        .where(and(...conditions))
        .orderBy(desc(tickets.createdAt));

      return results;
    }),

  /**
   * Get single ticket with QR code
   */
  getTicket: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const [result] = await db
        .select({
          ticket: tickets,
          event: events,
        })
        .from(tickets)
        .innerJoin(events, eq(tickets.eventId, events.id))
        .where(
          and(
            eq(tickets.id, input.id),
            eq(tickets.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (!result) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Ticket not found",
        });
      }

      return result;
    }),
});
