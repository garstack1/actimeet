import type { Request, Response } from "express";
import jwt from "jsonwebtoken";
import { db, type User } from "@actimeet/database";
import { users } from "@actimeet/database/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";

export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
}

export interface Context {
  req: Request;
  res: Response;
  user: User | null;
}

/**
 * Extract and verify JWT token from Authorization header
 */
async function getUserFromToken(token: string): Promise<User | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, payload.userId))
      .limit(1);
    
    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Create context for each request
 */
export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  // Extract token from Authorization header
  const authHeader = req.headers.authorization;
  let user: User | null = null;

  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    user = await getUserFromToken(token);
  }

  return {
    req,
    res,
    user,
  };
}

export type { Context as TRPCContext };
