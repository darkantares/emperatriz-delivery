import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl, API_URL } from './api';
// Importar el servicio de notificaciones
import { queueNotification, NotificationType } from './notificationService';
import { IEnterpriseEntity, IUserEntity } from '@/interfaces/auth';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';
import { adaptDeliveriesToAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { getStoredTokens, storeTokens } from './auth-fetch';

const SOCKET_URL = getBaseUrl();

let pendingNotification = false;

function queueNotificationSound() {
  pendingNotification = true;
}

export interface SocketParam<T> {
  data: T;
	userId: IUserEntity['id'];
	enterpriseId: IEnterpriseEntity['id'];
	message: string;
	timestamp: string
}

export function checkPendingNotifications(): boolean {
  if (pendingNotification) {
    pendingNotification = false;
    return true;
  }
  return false;
}

export enum SocketEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  HEARTBEAT = 'websocket-heartbeat',
  DRIVER_ASSIGNED = 'driver-assigned',
  DELIVERY_UPDATED = 'delivery-updated',
  DELIVERY_STATUS_CHANGED = 'delivery-status-changed',
  DELIVERY_REORDERED = 'delivery-reordered',
  DELIVERY_ASSIGNMENT_UPDATED = 'delivery-assignment-updated',
  DRIVERS_GROUP_ASSIGNED = 'drivers-group-assigned'
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionListeners: Set<Function> = new Set();
  private _connected: boolean = false;
  private proactiveRefreshTimer: ReturnType<typeof setInterval> | null = null;

  private options = {
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: false,
  };

  constructor() { }

  get connected(): boolean {
    return this._connected;
  }

  async connect() {
    try {
      // Si ya está conectado, no hacer nada
      if (this.socket && this._connected) {
        console.log('[SocketService] Ya conectado, ignorando connect()');
        return true;
      }

      console.log("Iniciando conexión Socket.IO...");

      // Obtener token fresco
      const freshToken = await this.ensureFreshToken();
      if (!freshToken) {
        console.log("[SocketService] Sin token disponible. No se puede conectar.");
        return false;
      }

      // Si el socket ya existe pero está desconectado, reutilizarlo
      // (evita destruir y recrear, lo que causaría una segunda conexión en el backend)
      if (this.socket && !this._connected) {
        console.log('[SocketService] Reutilizando socket existente, reconectando...');
        this.socket.connect();
        return true;
      }

      // Crear socket nuevo (primera vez)
      if (this.socket) {
        this.socket.disconnect();
      }

      // Use a callback for `auth` so that every reconnect attempt (including
      // automatic ones) reads the latest token from storage. This way, once
      // an HTTP request refreshes the token, the next socket reconnect will
      // succeed without any manual intervention.
      this.socket = io(SOCKET_URL, {
        ...this.options,
        auth: (cb: (data: { token: string }) => void) => {
          AsyncStorage.getItem('auth_token').then((token) => {
            cb({ token: token || '' });
          });
        },
        transports: ['websocket'],
      });

      this.socket.on(SocketEventType.CONNECT, () => {
        console.log('Socket.IO conectado');
        this._connected = true;
        this.notifyConnectionListeners();
        this.startProactiveRefresh();
      });

      this.socket.on(SocketEventType.DISCONNECT, (reason: string) => {
        console.log('Socket.IO desconectado. Razón:', reason);
        this._connected = false;
        this.notifyConnectionListeners();
        this.stopProactiveRefresh();
      });

      this.socket.on(SocketEventType.CONNECT_ERROR, async (error) => {
        console.log('Error de conexión Socket.IO:', error);
        this._connected = false;
        this.notifyConnectionListeners();
        // Si el error es de autenticación, refrescar el token proactivamente
        // para que el siguiente intento de reconexión automática use un token válido.
        const msg: string = (error as any)?.message || '';
        if (msg.includes('Unauthorized') || msg.includes('jwt') || msg.includes('token') || msg.includes('auth')) {
          console.log('[SocketService] Error de auth detectado, refrescando token...');
          await this.ensureFreshToken();
        }
      });

      this.socket.onAny((event) => {
        if (
          event === SocketEventType.DRIVER_ASSIGNED ||
          event === SocketEventType.DELIVERY_UPDATED ||
          event === SocketEventType.DELIVERY_STATUS_CHANGED ||
          event === SocketEventType.DELIVERY_REORDERED ||
          event === SocketEventType.DRIVERS_GROUP_ASSIGNED
        ) {
          console.log('Evento recibido:', event);
          queueNotificationSound();
        }
      });

      this.setupEventListeners();

      // Conectar con el token fresco
      this.socket.connect();
      return true;
    } catch (error:any) {
      console.log("Error al conectar Socket.IO:", error);
      this._connected = false;
      this.notifyConnectionListeners();
      return false;
    }
  }

  /**
   * Checks whether the stored JWT access token is expired.
   * Uses manual base64 payload decode (no external dependencies).
   */
  private isTokenExpired(token: string): boolean {
    try {
      const payloadB64 = token.split('.')[1];
      if (!payloadB64) return true;
      const normalized = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      // atob is available in Expo SDK 50+ (React Native 0.73+)
      const payload = JSON.parse(atob(normalized));
      if (!payload.exp) return false;
      // Add a 30-second buffer so we refresh slightly before actual expiry
      return payload.exp * 1000 < Date.now() + 30_000;
    } catch {
      return true;
    }
  }

  /**
   * Returns a valid access token. If the stored token is expired and a
   * refresh token is available, it sends a request to the backend that
   * triggers the TokenRefreshMiddleware, which refreshes both tokens and
   * returns them via X-New-Access-Token / X-New-Refresh-Token headers.
   */
  private async ensureFreshToken(): Promise<string | null> {
    try {
      const { accessToken, refreshToken } = await getStoredTokens();

      if (!accessToken && !refreshToken) return null;

      // Token is still valid — use it directly
      if (accessToken && !this.isTokenExpired(accessToken)) {
        return accessToken;
      }

      // Token expired or missing — try to refresh via the backend middleware
      if (refreshToken) {
        console.log('[SocketService] Token expirado, intentando refresh antes de conectar...');
        const expiredToken = accessToken || '';
        const newToken = await this.refreshViaBackend(expiredToken, refreshToken);
        if (newToken) {
          console.log('[SocketService] Token refrescado, conectando con token nuevo');
          return newToken;
        }
        console.log('[SocketService] Refresh falló, no se puede conectar');
      }

      return null;
    } catch (error) {
      console.log('[SocketService] Error en ensureFreshToken:', error);
      return null;
    }
  }

  /**
   * Calls the backend whoami endpoint with the expired access token +
   * refresh token. The TokenRefreshMiddleware on the backend detects the
   * expired access token, refreshes it, and returns the new tokens in
   * X-New-Access-Token / X-New-Refresh-Token response headers.
   */
  private async refreshViaBackend(expiredToken: string, refreshToken: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_URL}/auth/whoami`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${expiredToken}`,
          'x-refresh-token': refreshToken,
        },
      });

      // The interceptor on the backend sets these headers after a successful refresh
      const newAccessToken =
        response.headers.get('X-New-Access-Token') ||
        response.headers.get('x-new-access-token');
      const newRefreshToken =
        response.headers.get('X-New-Refresh-Token') ||
        response.headers.get('x-new-refresh-token');

      if (newAccessToken) {
        await storeTokens(newAccessToken, newRefreshToken || refreshToken);
        return newAccessToken;
      }

      // whoami succeeded without returning new headers (token was still valid)
      if (response.ok) {
        const { accessToken } = await getStoredTokens();
        return accessToken;
      }

      return null;
    } catch (error) {
      console.log('[SocketService] Error al llamar whoami para refresh:', error);
      return null;
    }
  }

  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on(SocketEventType.DRIVER_ASSIGNED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Conductor asignado');
      console.log(data);
      
      // Encolar una notificación
      queueNotification(
        NotificationType.SUCCESS,
        message,
        `Se te ha asignado la entrega #${data.id}`,
        true
      );

      this.notifyListeners(SocketEventType.DRIVER_ASSIGNED, adaptDeliveriesToAdapter([data])[0]);
    });

    this.socket.on(SocketEventType.DRIVERS_GROUP_ASSIGNED, ({data,message}: SocketParam<IDeliveryAssignmentEntity[]>) => {
      console.log('Evento recibido - Conductor asignado');
      console.log(data);
      // Encolar una notificación
      queueNotification(
        NotificationType.SUCCESS,
        message,
        `Se te ha asignado un grupo de entregas`,
        true
      );

      this.notifyListeners(SocketEventType.DRIVERS_GROUP_ASSIGNED, adaptDeliveriesToAdapter(data));
    });

    this.socket.on(SocketEventType.DELIVERY_UPDATED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Entrega actualizada:', data);

      queueNotification(
        NotificationType.INFO,
        message,
        `Las entregas ha sido actualizada`,
        true
      );

      this.notifyListeners(SocketEventType.DELIVERY_UPDATED, adaptDeliveriesToAdapter([data])[0]);
    });

    this.socket.on(SocketEventType.DELIVERY_REORDERED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Entrega reordenada');
      console.log(data);
      
      queueNotification(
        NotificationType.INFO,
        'Entrega reordenada',
        message,
        true
      );

      this.notifyListeners(SocketEventType.DELIVERY_REORDERED, adaptDeliveriesToAdapter([data])[0]);
    });

    this.socket.on(SocketEventType.DELIVERY_STATUS_CHANGED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Estado de entrega cambiado');

      queueNotification(
        NotificationType.INFO,
        message,
        `La entrega #${data.id} ahora está ${data.deliveryStatus.title}`,
        true
      );

      this.notifyListeners(SocketEventType.DELIVERY_STATUS_CHANGED, adaptDeliveriesToAdapter([data])[0]);
    });

    this.socket.on(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, ({data}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Asignación de entrega actualizada');
      this.notifyListeners(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, adaptDeliveriesToAdapter([data])[0]);
    });

    this.socket.on(SocketEventType.HEARTBEAT, (data: any) => {
      console.log('[SocketService] Heartbeat recibido:', data);
      this.notifyListeners(SocketEventType.HEARTBEAT, data);
    });
   
  }

  disconnect() {
    this.stopProactiveRefresh();
    if (this.socket) {
      console.log("Desconectando Socket.IO...");
      this.socket.disconnect();
      this._connected = false;
      this.notifyConnectionListeners();
    }
  }

  // ---------- Refresco proactivo de token ----------

  /**
   * Inicia un intervalo de 60 s que comprueba si el token está por vencer
   * y lo refresca proactivamente, sin necesitar una petición HTTP del usuario.
   * El token refrescado se guarda en AsyncStorage y el callback de auth
   * del socket lo leerá automáticamente en el siguiente intento de reconexión.
   */
  private startProactiveRefresh(): void {
    this.stopProactiveRefresh();
    this.proactiveRefreshTimer = setInterval(async () => {
      const { accessToken } = await getStoredTokens();
      if (accessToken && this.isTokenExpired(accessToken)) {
        console.log('[SocketService] Token expirando, refrescando proactivamente...');
        await this.ensureFreshToken();
      }
    }, 60_000);
  }

  private stopProactiveRefresh(): void {
    if (this.proactiveRefreshTimer !== null) {
      clearInterval(this.proactiveRefreshTimer);
      this.proactiveRefreshTimer = null;
    }
  }

  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.add(callback);

    callback(this._connected);
  }

  offConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.delete(callback);
  }

  private notifyListeners(event: string, data?: any) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error:any) {
          console.log(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(callback => {
      try {
        callback(this._connected);
      } catch (error:any) {
        console.log('Error en listener de conexión:', error);
      }
    });
  }

  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      console.log(`Emitiendo evento ${event}:`, data);
      this.socket.emit(event, data);
      return true;
    }
    console.warn(`No se pudo emitir ${event}: Socket no conectado`);
    return false;
  }

  isConnected(): boolean {
    return this._connected;
  }
}

export const socketService = new SocketService();