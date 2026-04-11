import { router } from "./trpc/trpc.js";
import { authRouter } from "./routers/auth.js";
import { eventsRouter } from "./routers/events.js";
import { ticketsRouter } from "./routers/tickets.js";

/**
 * Main application router
 */
export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  tickets: ticketsRouter,
});

/**
 * Export type for client usage
 */
export type AppRouter = typeof appRouter;
