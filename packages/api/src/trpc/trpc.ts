import { initTRPC, TRPCError } from "@trpc/server";
import type { Context } from "./context.js";

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create();

/**
 * Base router and procedure
 */
export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Middleware to check if user is authenticated
 */
const isAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is now guaranteed to be non-null
    },
  });
});

/**
 * Middleware to check if user is a provider
 */
const isProvider = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  if (ctx.user.role !== "provider" && ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a provider to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Middleware to check if user is an admin
 */
const isAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }
  if (ctx.user.role !== "admin") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be an admin to access this resource",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

/**
 * Protected procedures
 */
export const protectedProcedure = t.procedure.use(isAuthenticated);
export const providerProcedure = t.procedure.use(isProvider);
export const adminProcedure = t.procedure.use(isAdmin);
