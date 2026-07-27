import { decodeJwtPayload, validateJwtHasEnterprise, validateJwtPayload } from '../../../utils/jwt-utils';

// Helper to create a mock JWT token
function createMockJWT(payload: Record<string, any>): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = btoa(JSON.stringify(payload));
  const signature = 'mock-signature';
  return `${header}.${body}.${signature}`;
}

describe('jwt-utils', () => {
  describe('decodeJwtPayload', () => {
    it('should decode a valid JWT token', () => {
      const payload = { id: 1, email: 'test@example.com', enterprise: 1 };
      const token = createMockJWT(payload);
      const decoded = decodeJwtPayload(token);
      expect(decoded).toEqual(payload);
    });

    it('should decode JWT with Bearer prefix', () => {
      const payload = { id: 1, email: 'test@example.com' };
      const token = createMockJWT(payload);
      const decoded = decodeJwtPayload(`Bearer ${token}`);
      expect(decoded).toEqual(payload);
    });

    it('should decode JWT with bearer prefix (lowercase)', () => {
      const payload = { id: 1 };
      const token = createMockJWT(payload);
      const decoded = decodeJwtPayload(`bearer ${token}`);
      expect(decoded).toEqual(payload);
    });

    it('should return null for invalid token format', () => {
      const result = decodeJwtPayload('invalid-token');
      expect(result).toBeNull();
    });

    it('should return null for token with only 2 parts', () => {
      const result = decodeJwtPayload('header.payload');
      expect(result).toBeNull();
    });

    it('should return null for token with invalid base64', () => {
      const result = decodeJwtPayload('header.!!!invalid-base64!!!.signature');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = decodeJwtPayload('');
      expect(result).toBeNull();
    });
  });

  describe('validateJwtHasEnterprise', () => {
    it('should return true when JWT has enterprise', () => {
      const token = createMockJWT({ id: 1, enterprise: 1 });
      expect(validateJwtHasEnterprise(token)).toBe(true);
    });

    it('should return false when JWT has no enterprise', () => {
      const token = createMockJWT({ id: 1, email: 'test@test.com' });
      expect(validateJwtHasEnterprise(token)).toBe(false);
    });

    it('should return false when enterprise is null', () => {
      const token = createMockJWT({ id: 1, enterprise: null });
      expect(validateJwtHasEnterprise(token)).toBe(false);
    });

    it('should return false when enterprise is undefined', () => {
      const token = createMockJWT({ id: 1, enterprise: undefined });
      expect(validateJwtHasEnterprise(token)).toBe(false);
    });

    it('should return false for invalid token', () => {
      expect(validateJwtHasEnterprise('invalid-token')).toBe(false);
    });
  });

  describe('validateJwtPayload', () => {
    it('should return payload when valid with id', () => {
      const payload = { id: 1, email: 'test@test.com', enterprise: 1 };
      const token = createMockJWT(payload);
      const result = validateJwtPayload(token);
      expect(result).toEqual(payload);
    });

    it('should return payload when valid with sub', () => {
      const payload = { sub: 1, email: 'test@test.com' };
      const token = createMockJWT(payload);
      const result = validateJwtPayload(token);
      expect(result).toEqual(payload);
    });

    it('should return null when no id or sub', () => {
      const token = createMockJWT({ email: 'test@test.com' });
      const result = validateJwtPayload(token);
      expect(result).toBeNull();
    });

    it('should return null for invalid token', () => {
      const result = validateJwtPayload('invalid-token');
      expect(result).toBeNull();
    });

    it('should return payload even without enterprise (with warning)', () => {
      const payload = { id: 1, email: 'test@test.com' };
      const token = createMockJWT(payload);
      const result = validateJwtPayload(token);
      expect(result).not.toBeNull();
      expect(result?.id).toBe(1);
    });
  });
});
