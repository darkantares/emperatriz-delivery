import { z } from 'zod';
import { OkLoginResponseSchema } from './schemas/auth.schema';
import { OkDeliveryArraySchema, OkOptimizedRouteSchema, OkDeliverySchema } from './schemas/delivery.schema';
import { OkDeliveryStatusArraySchema } from './schemas/deliveryStatus.schema';
import { OkPaymentMethodArraySchema } from './schemas/paymentMethod.schema';
import { OkOsrmTripSchema, OkOsrmRouteSchema } from './schemas/osrm.schema';

// use the broadly-typed base to avoid deprecated signatures
// and to allow any schema shape
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySchema = z.ZodTypeAny;

/**
 * Maps endpoint path prefixes to Zod schemas.
 *
 * Each schema validates the full OkResult body returned by the backend:
 *   { ok: true, value: <specific type> }
 *
 * Add a new entry here whenever a new backend endpoint is introduced.
 * Existing interfaces are preserved — schemas enforce the same contract at runtime.
 */
export const schemaRegistry: Record<string, AnySchema> = {
    '/auth/login-delivery':                OkLoginResponseSchema,
    '/delivery-assignments/courier':       OkOptimizedRouteSchema,
    // generic list response used by /delivery-assignments (GET)
    '/delivery-assignments':               OkDeliveryArraySchema,
    '/delivery-status':      OkDeliveryStatusArraySchema,
    '/payment-methods':      OkPaymentMethodArraySchema,
    '/admin/osrm/trip':      OkOsrmTripSchema,
    '/admin/osrm/route':     OkOsrmRouteSchema,
};

/**
 * Finds the first registered schema whose key is a prefix of the given URL.
 * Supports dynamic segments, e.g. /delivery-assignments/123 matches /delivery-assignments.
 */
export function findSchema(url: string): AnySchema | undefined {
    const normalized = url.startsWith('/') ? url : `/${url}`;

    // special case: batch status-unified returns an array
    if (/^\/delivery-assignments\/batch\/status-unified($|\/|\?)/.test(normalized)) {
        return OkDeliveryArraySchema;
    }

    // special case: single assignment returned when updating status, status-with-images, or status-unified
    if (/^\/delivery-assignments\/\d+\/status(-with-images|-unified)?($|\/|\?)/.test(normalized)) {
        return OkDeliverySchema;
    }

    const key = Object.keys(schemaRegistry).find(
        (k) =>
            normalized === k ||
            normalized.startsWith(`${k}/`) ||
            normalized.startsWith(`${k}?`),
    );
    return key ? schemaRegistry[key] : undefined;
}
