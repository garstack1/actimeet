import { router } from "./trpc/trpc.js";
import { authRouter } from "./routers/auth.js";
import { eventsRouter } from "./routers/events.js";
import { ticketsRouter } from "./routers/tickets.js";
import { messagingRouter } from "./routers/messaging.js";
import { venuesRouter } from "./routers/venues.js";

export const appRouter = router({
  auth: authRouter,
  events: eventsRouter,
  tickets: ticketsRouter,
  messaging: messagingRouter,
  venues: venuesRouter,
});

export type AppRouter = typeof appRouter;
