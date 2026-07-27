import { OkLoginResponseSchema } from '../../api/schemas/auth.schema';

describe('Auth Schemas', () => {
  const validUser = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    firstname: 'Test',
    lastname: 'User',
    isActive: true,
    isAuthenticated: true,
    isEmailVerified: true,
    enterprise: {
      id: 1,
      title: 'Enterprise 1',
      email: 'enterprise@example.com',
    },
    userRoles: [
      { id: 1, title: 'Admin', order: 1 },
    ],
  };

  const validLoginResponse = {
    user: validUser,
    access_token: 'mock-access-token-123',
    refresh_token: 'mock-refresh-token-456',
    carrier: {
      id: 1,
      firstname: 'Driver',
      lastname: 'One',
      phone: '809-555-0101',
      address: 'Main Street',
    },
  };

  describe('OkLoginResponseSchema', () => {
    it('should validate a correct login response wrapped in OkResult', () => {
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: validLoginResponse,
      });
      expect(result.success).toBe(true);
    });

    it('should validate login response without carrier', () => {
      const loginWithoutCarrier = {
        ...validLoginResponse,
        carrier: null,
      };
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: loginWithoutCarrier,
      });
      expect(result.success).toBe(true);
    });

    it('should validate login response without optional carrier field', () => {
      const loginWithoutCarrierField = {
        user: validUser,
        access_token: 'mock-access-token-123',
        refresh_token: 'mock-refresh-token-456',
      };
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: loginWithoutCarrierField,
      });
      expect(result.success).toBe(true);
    });

    it('should reject when ok is false', () => {
      const result = OkLoginResponseSchema.safeParse({
        ok: false,
        value: validLoginResponse,
      });
      expect(result.success).toBe(false);
    });

    it('should reject when user is missing', () => {
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: {
          access_token: 'token',
          refresh_token: 'refresh',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject when access_token is missing', () => {
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: {
          user: validUser,
          refresh_token: 'refresh',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should reject when refresh_token is missing', () => {
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: {
          user: validUser,
          access_token: 'token',
        },
      });
      expect(result.success).toBe(false);
    });

    it('should allow extra fields in user (loose schema)', () => {
      const userWithExtra = {
        ...validUser,
        customField: 'custom-value',
      };
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: {
          ...validLoginResponse,
          user: userWithExtra,
        },
      });
      expect(result.success).toBe(true);
    });

    it('should validate user with minimal fields', () => {
      const minimalUser = { id: 1 };
      const result = OkLoginResponseSchema.safeParse({
        ok: true,
        value: {
          user: minimalUser,
          access_token: 'token',
          refresh_token: 'refresh',
        },
      });
      expect(result.success).toBe(true);
    });

    it('should parse and return typed data', () => {
      const result = OkLoginResponseSchema.parse({
        ok: true,
        value: validLoginResponse,
      });
      expect(result.ok).toBe(true);
      expect(result.value.user.id).toBe(1);
      expect(result.value.access_token).toBe('mock-access-token-123');
      expect(result.value.carrier?.firstname).toBe('Driver');
    });
  });
});
