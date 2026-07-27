import { OkPaymentMethodArraySchema } from '../../api/schemas/paymentMethod.schema';

describe('PaymentMethod Schemas', () => {
  describe('OkPaymentMethodArraySchema', () => {
    it('should validate a correct payment method array', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: true,
        value: [
          { id: 1, title: 'Efectivo' },
          { id: 2, title: 'Tarjeta' },
          { id: 3, title: 'Transferencia' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: true,
        value: [],
      });
      expect(result.success).toBe(true);
    });

    it('should validate with minimal fields', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: true,
        value: [{ id: 1, title: 'Cash' }],
      });
      expect(result.success).toBe(true);
    });

    it('should allow extra fields (loose schema)', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: true,
        value: [{ id: 1, title: 'Cash', customField: 'custom' }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject when ok is false', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: false,
        value: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject when value is not an array', () => {
      const result = OkPaymentMethodArraySchema.safeParse({
        ok: true,
        value: 'not an array',
      });
      expect(result.success).toBe(false);
    });

    it('should parse and return typed data', () => {
      const result = OkPaymentMethodArraySchema.parse({
        ok: true,
        value: [{ id: 1, title: 'Efectivo' }],
      });
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(1);
      expect(result.value[0].title).toBe('Efectivo');
    });
  });
});
