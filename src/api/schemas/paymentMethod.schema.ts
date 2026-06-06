import { z } from 'zod';
import { OkResultOf } from './global.schema';

const PaymentMethodSchema = z.object({
    id: z.number(),
    title: z.string(),
}).loose();

const PaymentMethodArraySchema = z.array(PaymentMethodSchema);

const OkPaymentMethodSchema = OkResultOf(PaymentMethodSchema);
export const OkPaymentMethodArraySchema = OkResultOf(PaymentMethodArraySchema);
