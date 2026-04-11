import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "@actimeet/api";

export const trpc = createTRPCReact<AppRouter>();
