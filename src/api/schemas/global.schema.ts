import { z } from 'zod';

/**
 * Generic OkResult wrapper – the backend uses this shape for all successful
 * responses: { ok: true, value: T }.
 *
 * Usage:
 *   const OkLoginSchema = OkResultOf(LoginResponseSchema);
 */
export const OkResultOf = <T extends z.ZodTypeAny>(valueSchema: T) =>
    z.object({
        ok: z.literal(true),
        value: valueSchema,
    }).loose();
