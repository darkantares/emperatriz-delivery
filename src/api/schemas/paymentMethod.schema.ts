import { z } from 'zod';
import { OkResultOf } from './global.schema';

export const PaymentMethodSchema = z.object({
    id: z.number(),
    title: z.string(),
}).loose();

export const PaymentMethodArraySchema = z.array(PaymentMethodSchema);

export const OkPaymentMethodSchema = OkResultOf(PaymentMethodSchema);
export const OkPaymentMethodArraySchema = OkResultOf(PaymentMethodArraySchema);
