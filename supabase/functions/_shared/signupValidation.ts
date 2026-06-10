/**
 * Server-side mirror of the client signup validation.
 * Runtime: Deno. Import zod via esm.sh.
 * Keep these rules in sync with src/pages/signup/validation.ts
 */
// @ts-ignore deno esm import
import { z } from "https://esm.sh/zod@3.23.8";

const nameRegex = /^[\p{L}][\p{L}\s'\-]{1,79}$/u;

export const Step1Schema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name too short")
    .max(80, "Name too long")
    .regex(nameRegex, "Invalid characters in name"),
  email: z.string().trim().toLowerCase().email("Invalid email").max(255),
  password: z
    .string()
    .min(8, "Password too short")
    .regex(/[a-z]/, "Password must contain a lowercase letter")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[^a-zA-Z0-9]/, "Password must contain a special character"),
});

export const VerifyEmailActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("check"),
    email: z.string().email().max(255),
  }),
  z.object({
    action: z.literal("lookup"),
    email: z.string().email().max(255),
  }),
  z.object({
    action: z.literal("send"),
    email: z.string().email().max(255),
  }),
  z.object({
    action: z.literal("verify"),
    email: z.string().email().max(255),
    code: z.string().regex(/^\d{6}$/, "Code must be 6 digits"),
  }),
]);

export const UserRequestSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(nameRegex, "Invalid name"),
  email: z.string().trim().toLowerCase().email().max(255),
  company_name: z.string().trim().min(2).max(120),
  role: z.enum(["buyer", "supplier"]),
  registration_country: z.string().trim().min(2).max(100),
  tax_id: z.string().trim().min(3).max(40),
  phone: z.string().trim().min(5).max(40).optional().nullable(),
  website: z
    .string()
    .trim()
    .url()
    .max(255)
    .optional()
    .nullable()
    .or(z.literal("")),
});