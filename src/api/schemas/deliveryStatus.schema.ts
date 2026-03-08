import { z } from 'zod';
import { OkResultOf } from './global.schema';

export const DeliveryStatusEntitySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
}).loose();

export const DeliveryStatusArraySchema = z.array(DeliveryStatusEntitySchema);

export const OkDeliveryStatusSchema = OkResultOf(DeliveryStatusEntitySchema);
export const OkDeliveryStatusArraySchema = OkResultOf(DeliveryStatusArraySchema);
