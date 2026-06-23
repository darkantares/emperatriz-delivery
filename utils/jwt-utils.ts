/**
 * jwt-utils.ts
 *
 * Utilidades para validar el payload del JWT.
 *
 * PROPÓSITO:
 *   Detectar bugs del backend antes de que lleguen al usuario.
 *   Si el JWT no tiene el campo `enterprise`, es un bug que debe
 *   reportarse inmediatamente.
 *
 * USO:
 *   import { validateJwtPayload, logJwtValidation } from '../utils/jwt-utils';
 *
 *   // Después del login:
 *   const payload = validateJwtPayload(token);
 *   if (!payload) {
 *     console.error('JWT inválido');
 *   }
 */

export interface JwtPayload {
  id?: number;
  sub?: number;
  email?: string;
  enterprise?: number;
  roles?: string[];
  exp?: number;
  iat?: number;
}

/**
 * Decodifica y valida el payload del JWT.
 *
 * @param token - Token JWT (sin prefijo "Bearer ")
 * @returns El payload decodificado, o null si es inválido
 */
export const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    // Remover prefijo "Bearer " si existe
    const cleanToken = token.replace(/^Bearer\s+/i, '');

    // Dividir el token en partes
    const parts = cleanToken.split('.');
    if (parts.length !== 3) {
      console.error('[JWT] Token inválido: formato incorrecto');
      return null;
    }

    // Decodificar el payload (segunda parte)
    const payload = JSON.parse(atob(parts[1]));
    return payload as JwtPayload;
  } catch (error) {
    console.error('[JWT] Error al decodificar token:', error);
    return null;
  }
};

/**
 * Valida que el payload del JWT tenga el campo `enterprise`.
 *
 * @param token - Token JWT
 * @returns true si el payload tiene enterprise, false si no
 */
export const validateJwtHasEnterprise = (token: string): boolean => {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    console.error('[JWT] No se pudo decodificar el token');
    return false;
  }

  if (payload.enterprise === undefined || payload.enterprise === null) {
    console.error('[JWT] ⚠️ BUG DEL BACKEND: Token JWT sin campo "enterprise"', {
      payload: {
        id: payload.id,
        email: payload.email,
        roles: payload.roles,
        enterprise: payload.enterprise,
      },
    });
    return false;
  }

  return true;
};

/**
 * Valida que el payload del JWT tenga los campos mínimos requeridos.
 *
 * @param token - Token JWT
 * @returns El payload si es válido, o null si no lo es
 */
export const validateJwtPayload = (token: string): JwtPayload | null => {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return null;
  }

  // Verificar campos mínimos
  const hasUserId = payload.id !== undefined || payload.sub !== undefined;
  const hasEnterprise = payload.enterprise !== undefined && payload.enterprise !== null;

  if (!hasUserId) {
    console.error('[JWT] Token sin ID de usuario');
    return null;
  }

  if (!hasEnterprise) {
    console.warn('[JWT] ⚠️ Token sin campo "enterprise" — backend podría tener un bug');
    // No retornamos null porque algunos endpoints pueden no necesitar enterprise
    // Pero lo registramos para monitoreo
  }

  return payload;
};

/**
 * Log de validación JWT para debugging.
 * Solo se ejecuta en modo desarrollo.
 *
 * @param token - Token JWT
 * @param context - Contexto del log (ej: 'login', 'refresh')
 */
export const logJwtValidation = (token: string, context: string): void => {
  if (__DEV__) {
    const payload = decodeJwtPayload(token);
    if (payload) {
      console.log(`[JWT:${context}]`, {
        id: payload.id,
        email: payload.email,
        enterprise: payload.enterprise,
        roles: payload.roles,
        exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : 'N/A',
      });
    }
  }
};
