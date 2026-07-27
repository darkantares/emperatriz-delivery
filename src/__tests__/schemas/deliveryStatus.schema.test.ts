import { OkDeliveryStatusArraySchema } from '../../api/schemas/deliveryStatus.schema';

describe('DeliveryStatus Schemas', () => {
  describe('OkDeliveryStatusArraySchema', () => {
    it('should validate a correct delivery status array', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: true,
        value: [
          { id: 1, title: 'Pending', name: 'pending', status: 'active' },
          { id: 2, title: 'In Progress', name: 'in_progress', status: 'active' },
          { id: 3, title: 'Delivered', name: 'delivered', status: 'completed' },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should validate empty array', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: true,
        value: [],
      });
      expect(result.success).toBe(true);
    });

    it('should validate status with minimal fields', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: true,
        value: [{ id: 1 }],
      });
      expect(result.success).toBe(true);
    });

    it('should allow extra fields (loose schema)', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: true,
        value: [{ id: 1, title: 'Pending', customField: 'custom' }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject when ok is false', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: false,
        value: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject when value is not an array', () => {
      const result = OkDeliveryStatusArraySchema.safeParse({
        ok: true,
        value: 'not an array',
      });
      expect(result.success).toBe(false);
    });

    it('should parse and return typed data', () => {
      const result = OkDeliveryStatusArraySchema.parse({
        ok: true,
        value: [{ id: 1, title: 'Pending' }],
      });
      expect(result.ok).toBe(true);
      expect(result.value).toHaveLength(1);
      expect(result.value[0].id).toBe(1);
      expect(result.value[0].title).toBe('Pending');
    });
  });
});
