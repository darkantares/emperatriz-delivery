/**
 * AuthStore - Almacenamiento centralizado de autenticación IN-MEMORY.
 *
 * El Access Token, CSRF Token, usuario y permisos se almacenan únicamente en memoria.
 * NUNCA se escriben en AsyncStorage o SecureStore.
 *
 * El Refresh Token se maneja exclusivamente via Expo SecureStore
 * y es enviado al backend en el body de /auth/refresh-token.
 */

import { IUserEntity, IRolesAllowedEntity, DeliveryPersonEntity } from '@/interfaces/auth';

// Estado en memoria
let accessToken: string | null = null;
let csrfToken: string | null = null;
let user: IUserEntity | null = null;
let carrier: DeliveryPersonEntity | null = null;
let roles: IRolesAllowedEntity[] | null = null;

export const authStore = {
  // Access Token
  getAccessToken: (): string | null => accessToken,
  setAccessToken: (token: string | null): void => {
    accessToken = token;
  },
  hasValidToken: (): boolean => {
    if (!accessToken) return false;
    try {
      const payloadB64 = accessToken.split('.')[1];
      if (!payloadB64) return false;
      const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(normalized));
      if (!payload.exp) return true;
      return payload.exp * 1000 > Date.now();
    } catch {
      return false;
    }
  },

  // CSRF Token
  getCsrfToken: (): string | null => csrfToken,
  setCsrfToken: (token: string | null): void => {
    csrfToken = token;
  },

  // User
  getUser: (): IUserEntity | null => user,
  setUser: (u: IUserEntity | null): void => {
    user = u;
  },

  // Carrier
  getCarrier: (): DeliveryPersonEntity | null => carrier,
  setCarrier: (c: DeliveryPersonEntity | null): void => {
    carrier = c;
  },

  // Roles
  getRoles: (): IRolesAllowedEntity[] | null => roles,
  setRoles: (r: IRolesAllowedEntity[] | null): void => {
    roles = r;
  },

  // Utilidad: establecer toda la sesión de una vez
  setSession: (data: {
    accessToken: string;
    csrfToken?: string;
    user: IUserEntity;
    carrier?: DeliveryPersonEntity | null;
    roles?: IRolesAllowedEntity[];
  }): void => {
    accessToken = data.accessToken;
    csrfToken = data.csrfToken ?? null;
    user = data.user;
    carrier = data.carrier ?? null;
    roles = data.roles ?? null;
  },

  // Limpiar toda la sesión
  clearSession: (): void => {
    accessToken = null;
    csrfToken = null;
    user = null;
    carrier = null;
    roles = null;
  },
};
