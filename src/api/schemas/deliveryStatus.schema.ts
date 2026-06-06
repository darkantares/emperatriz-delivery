import { z } from 'zod';
import { OkResultOf } from './global.schema';

const DeliveryStatusEntitySchema = z.object({
    id: z.number(),
    name: z.string().optional(),
    title: z.string().optional(),
    status: z.string().optional(),
}).loose();

const DeliveryStatusArraySchema = z.array(DeliveryStatusEntitySchema);

const OkDeliveryStatusSchema = OkResultOf(DeliveryStatusEntitySchema);
export const OkDeliveryStatusArraySchema = OkResultOf(DeliveryStatusArraySchema);
