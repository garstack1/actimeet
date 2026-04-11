import "dotenv/config";
import express from "express";
import cors from "cors";
import * as trpcExpress from "@trpc/server/adapters/express";
import { appRouter } from "./router.js";
import { createContext } from "./trpc/context.js";

const app = express();
const PORT = process.env.PORT ?? 3001;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  credentials: true,
}));
app.use(express.json());

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// tRPC handler
app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
    onError: ({ path, error }) => {
      console.error(`❌ tRPC error on '${path}':`, error.message);
    },
  })
);

// Start server
app.listen(PORT, () => {
  console.log(`
  🚀 ActiMeet API Server
  
  Environment: ${process.env.NODE_ENV ?? "development"}
  Port: ${PORT}
  Health: http://localhost:${PORT}/health
  tRPC: http://localhost:${PORT}/trpc
  
  Ready for requests!
  `);
});

export { appRouter, type AppRouter } from "./router.js";
