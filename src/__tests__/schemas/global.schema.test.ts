import { OkResultOf } from '../../api/schemas/global.schema';
import { z } from 'zod';

describe('OkResultOf (global.schema)', () => {
  const innerSchema = z.object({
    id: z.number(),
    name: z.string(),
  });

  const OkInnerSchema = OkResultOf(innerSchema);

  it('should validate a correct OkResult', () => {
    const result = OkInnerSchema.safeParse({
      ok: true,
      value: { id: 1, name: 'Test' },
    });
    expect(result.success).toBe(true);
  });

  it('should reject when ok is not true', () => {
    const result = OkInnerSchema.safeParse({
      ok: false,
      value: { id: 1, name: 'Test' },
    });
    expect(result.success).toBe(false);
  });

  it('should reject when value is missing', () => {
    const result = OkInnerSchema.safeParse({
      ok: true,
    });
    expect(result.success).toBe(false);
  });

  it('should reject when value has wrong shape', () => {
    const result = OkInnerSchema.safeParse({
      ok: true,
      value: { id: 'not-a-number', name: 123 },
    });
    expect(result.success).toBe(false);
  });

  it('should allow extra fields (loose schema)', () => {
    const result = OkInnerSchema.safeParse({
      ok: true,
      value: { id: 1, name: 'Test' },
      extraField: 'extra',
    });
    expect(result.success).toBe(true);
  });

  it('should work with nullable inner schema', () => {
    const NullableSchema = OkResultOf(innerSchema.nullable());
    
    const resultNull = NullableSchema.safeParse({ ok: true, value: null });
    expect(resultNull.success).toBe(true);

    const resultValue = NullableSchema.safeParse({ ok: true, value: { id: 1, name: 'Test' } });
    expect(resultValue.success).toBe(true);
  });

  it('should work with array inner schema', () => {
    const ArraySchema = OkResultOf(z.array(innerSchema));

    const result = ArraySchema.safeParse({
      ok: true,
      value: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }],
    });
    expect(result.success).toBe(true);
  });

  it('should parse and return typed data', () => {
    const result = OkInnerSchema.parse({
      ok: true,
      value: { id: 1, name: 'Test' },
    });
    expect(result.ok).toBe(true);
    expect(result.value.id).toBe(1);
    expect(result.value.name).toBe('Test');
  });
});
