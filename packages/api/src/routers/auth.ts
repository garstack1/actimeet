import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { TRPCError } from "@trpc/server";
import { router, publicProcedure, protectedProcedure } from "../trpc/trpc.js";
import { db, users, type NewUser } from "@actimeet/database";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-secret-change-in-production";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

// Validation schemas
const registerSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  displayName: z.string().min(2, "Display name must be at least 2 characters"),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional(),
  city: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  photos: z.array(z.string()).optional(),
  profilePhotoIndex: z.number().int().min(0).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

const updateProfileSchema = z.object({
  displayName: z.string().min(2).optional(),
  bio: z.string().max(500).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.enum(["male", "female", "non_binary", "prefer_not_to_say"]).optional(),
  showExactAge: z.boolean().optional(),
  city: z.string().optional(),
  countryCode: z.string().length(2).optional(),
  photos: z.array(z.string()).optional(),
  profilePhotoIndex: z.number().int().min(0).optional(),
});

/**
 * Generate JWT token
 */
function generateToken(user: { id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Auth router
 */
export const authRouter = router({
  /**
   * Register a new user
   */
  register: publicProcedure
    .input(registerSchema)
    .mutation(async ({ input }) => {
      // Check if email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "An account with this email already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 12);

      // Create user
      const newUser: NewUser = {
        email: input.email.toLowerCase(),
        passwordHash,
        displayName: input.displayName,
        dateOfBirth: input.dateOfBirth,
        gender: input.gender,
        city: input.city,
        countryCode: input.countryCode?.toUpperCase(),
      };

      const [user] = await db.insert(users).values(newUser).returning();

      if (!user) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create user",
        });
      }

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role ?? "user",
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
        },
        token,
      };
    }),

  /**
   * Login
   */
  login: publicProcedure
    .input(loginSchema)
    .mutation(async ({ input }) => {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, input.email.toLowerCase()))
        .limit(1);

      if (!user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Verify password
      const validPassword = await bcrypt.compare(input.password, user.passwordHash);

      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid email or password",
        });
      }

      // Check if account is active
      if (!user.isActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Your account has been deactivated",
        });
      }

      // Update last login
      await db
        .update(users)
        .set({ lastLoginAt: new Date() })
        .where(eq(users.id, user.id));

      // Generate token
      const token = generateToken({
        id: user.id,
        email: user.email,
        role: user.role ?? "user",
      });

      return {
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role,
          subscriptionTier: user.subscriptionTier,
        },
        token,
      };
    }),

  /**
   * Get current user
   */
  me: protectedProcedure.query(async ({ ctx }) => {
    return {
      id: ctx.user.id,
      email: ctx.user.email,
      displayName: ctx.user.displayName,
      bio: ctx.user.bio,
      dateOfBirth: ctx.user.dateOfBirth,
      gender: ctx.user.gender,
      showExactAge: ctx.user.showExactAge,
      photos: ctx.user.photos,
      profilePhotoIndex: ctx.user.profilePhotoIndex,
      city: ctx.user.city,
      countryCode: ctx.user.countryCode,
      role: ctx.user.role,
      subscriptionTier: ctx.user.subscriptionTier,
      emailVerified: ctx.user.emailVerified,
      createdAt: ctx.user.createdAt,
    };
  }),

  /**
   * Update profile
   */
  updateProfile: protectedProcedure
    .input(updateProfileSchema)
    .mutation(async ({ ctx, input }) => {
      const [updatedUser] = await db
        .update(users)
        .set({
          ...input,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.user.id))
        .returning();

      if (!updatedUser) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      return {
        id: updatedUser.id,
        email: updatedUser.email,
        displayName: updatedUser.displayName,
        bio: updatedUser.bio,
        gender: updatedUser.gender,
        city: updatedUser.city,
        countryCode: updatedUser.countryCode,
      };
    }),
});
