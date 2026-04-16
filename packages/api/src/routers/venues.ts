import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure, providerProcedure } from "../trpc/trpc.js";
import { db, venues, providers } from "@actimeet/database";
import { eq, and } from "drizzle-orm";

export const venuesRouter = router({
  myVenues: providerProcedure.query(async ({ ctx }) => {
    const [provider] = await db
      .select()
      .from(providers)
      .where(eq(providers.userId, ctx.user.id))
      .limit(1);

    if (!provider) {
      return [];
    }

    const results = await db
      .select()
      .from(venues)
      .where(eq(venues.providerId, provider.id));

    return results;
  }),

  create: providerProcedure
    .input(z.object({
      name: z.string().min(2).max(200),
      addressLine1: z.string().min(5),
      addressLine2: z.string().optional(),
      city: z.string().min(2),
      county: z.string().optional(),
      postcode: z.string().optional(),
      countryCode: z.string().length(2).default("IE"),
    }))
    .mutation(async ({ ctx, input }) => {
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

      const [venue] = await db
        .insert(venues)
        .values({
          providerId: provider.id,
          name: input.name,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          county: input.county,
          postcode: input.postcode,
          countryCode: input.countryCode,
        })
        .returning();

      return venue;
    }),
});
