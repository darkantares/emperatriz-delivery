import { z } from "zod";
import { OkResultOf } from "./global.schema";

export const EnterpriseSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    email: z.string(),
  })
  .loose();

export const DeliveryPersonSchema = z
  .object({
    id: z.number(),
    firstname: z.string().optional(),
    lastname: z.string().optional(),
    phone: z.string().optional(),
    address: z.string().optional(),
  })
  .loose();

export const RoleSchema = z
  .object({
    id: z.number(),
    title: z.string(),
    order: z.number(),
  })
  .loose();

export const UserEntitySchema = z
  .object({
    id: z.number(),
    isActive: z.boolean(),
    isAuthenticated: z.boolean(),
    password: z.string(),
    phone: z.string(),
    firstname: z.string(),
    lastname: z.string(),
    name: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    avatar: z.string().nullable().optional(),
    // userRoles: z.array(z.string()),
    enterprise: EnterpriseSchema,
  })
  .loose();

export const LoginResponseSchema = z
  .object({
    user: UserEntitySchema,
    access_token: z.string(),
    refresh_token: z.string(),
    // roles: z.array(RoleSchema).optional(),
    carrier: DeliveryPersonSchema.nullable().optional(),
  })
  .loose();

/** Full OkResult wrapping a LoginResponse */
export const OkLoginResponseSchema = OkResultOf(LoginResponseSchema);

export type LoginResponse = z.infer<typeof LoginResponseSchema>;
export type UserEntity = z.infer<typeof UserEntitySchema>;
