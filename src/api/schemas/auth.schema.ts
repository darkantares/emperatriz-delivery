import { z } from "zod";
import { OkResultOf } from "./global.schema";

const EnterpriseSchema = z
  .object({
    id: z.number(),
    title: z.string().optional().nullable(),
    email: z.string().optional().nullable(),
    files: z.string().optional().nullable(),
    document_verification: z.string().optional().nullable(),
  })
  .loose();

const BranchSchema = z
  .object({
    id: z.number(),
    title: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
  })
  .loose();

const DeliveryPersonSchema = z
  .object({
    id: z.number(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .loose();

const RoleSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    order: z.number().optional(),
  })
  .loose();

const UserEntitySchema = z
  .object({
    id: z.number(),
    isActive: z.boolean().optional(),
    isAuthenticated: z.boolean().optional(),
    phone: z.string().optional().nullable(),
    firstname: z.string().optional().nullable(),
    lastname: z.string().optional().nullable(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    enterprise: EnterpriseSchema.optional().nullable(),
    userRoles: z.array(RoleSchema).optional(),
    isEmailVerified: z.boolean().optional(),
    mustChangePassword: z.boolean().optional(),
    permissions: z.array(z.any()).optional(),
  })
  .loose();

const LoginResponseSchema = z
  .object({
    user: UserEntitySchema,
    access_token: z.string(),
    refresh_token: z.string(),
    carrier: DeliveryPersonSchema.nullable().optional(),
  })
  .loose();

/** Full OkResult wrapping a LoginResponse */
export const OkLoginResponseSchema = OkResultOf(LoginResponseSchema);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserEntity = z.infer<typeof UserEntitySchema>;
