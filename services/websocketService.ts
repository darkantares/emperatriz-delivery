import { io, Socket } from 'socket.io-client';
import { getBaseUrl, API_URL, getApiUrl } from './api';
// Importar el servicio de notificaciones
import { queueNotification, NotificationType } from './notificationService';
import { IEnterpriseEntity, IUserEntity } from '@/interfaces/auth';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';
import { adaptDeliveriesToAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { authStore } from '@/stores/authStore';
import { ApiEndpoints } from '../utils/api-endpoints';
import { refreshAccessToken, isTokenExpired, ensureFreshAccessToken, isTokenExpiringSoon } from './tokenManager';

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

function checkPendingNotifications(): boolean {
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
  DELIVERY_STATUS_UPDATED = 'delivery-status-updated',
  DRIVERS_GROUP_ASSIGNED = 'drivers-group-assigned',
  REQUEST_LOCATION_REFRESH = 'courier.location.refresh',
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionListeners: Set<Function> = new Set();
  private _connected: boolean = false;
  private _connecting: boolean = false;
  private _reconnecting: boolean = false;
  private proactiveRefreshTimer: ReturnType<typeof setInterval> | null = null;
  private proactiveRefreshAttempt = 0;

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
      if (this._connected) {
        console.log('[SocketService] Ya conectado, ignorando connect()');
        return true;
      }

      if (this._connecting) {
        console.log('[SocketService] Conexión ya en progreso, ignorando connect()');
        return false;
      }
      this._connecting = true;

      console.log('[SocketService] Iniciando conexión Socket.IO...');

      // Obtener token fresco via tokenManager centralizado
      const freshToken = await ensureFreshAccessToken();
      if (!freshToken) {
        console.log('[SocketService] Sin token disponible. No se puede conectar.');
        this._connecting = false;
        return false;
      }

      // Destruir socket anterior si existe
      if (this.socket) {
        console.log('[SocketService] Destruyendo socket anterior...');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Callback auth lee token fresco de authStore en cada intento de conexión
      this.socket = io(SOCKET_URL, {
        ...this.options,
        auth: (cb: (data: { token: string; clientType: string }) => void) => {
          const token = authStore.getAccessToken() || '';
          cb({ token, clientType: 'delivery' });
        },
        transports: ['websocket'],
      });

      this.socket.on(SocketEventType.CONNECT, () => {
        console.log('[SocketService] Socket.IO conectado:', this.socket?.id);
        this._connected = true;
        this._connecting = false;
        this.notifyConnectionListeners();
        this.startProactiveRefresh();
      });

      this.socket.on(SocketEventType.DISCONNECT, (reason: string) => {
        console.log('[SocketService] Socket.IO desconectado. Razón:', reason);
        this._connected = false;
        this._connecting = false;
        this.notifyConnectionListeners();
        this.stopProactiveRefresh();

        if (reason === 'io server disconnect') {
          // Kicked por el servidor — reconectar con token fresco
          console.log('[SocketService] Kicked por el servidor. Reconectando en 1.5s...');
          setTimeout(async () => {
            const token = authStore.getAccessToken();
            if (token) {
              await this.connect();
            }
          }, 1500);
        } else if (reason === 'transport close' || reason === 'ping timeout') {
          // Backend se cayó o red se perdió — refrescar token y reconectar
          console.log(`[SocketService] Conexión perdida (${reason}). Refrescando token y reconectando en 2s...`);
          setTimeout(async () => {
            await refreshAccessToken();
            await this.connect();
          }, 2000);
        }
        // Para otros motivos (ej: 'io client disconnect'), Socket.IO reconecta automáticamente
      });

      this.socket.on(SocketEventType.CONNECT_ERROR, async (error) => {
        console.log('[SocketService] Error de conexión Socket.IO:', (error as any)?.message || error);
        this._connected = false;
        this._connecting = false;
        this.notifyConnectionListeners();

        const msg: string = (error as any)?.message || '';
        if (msg.includes('Unauthorized') || msg.includes('jwt') || msg.includes('token') || msg.includes('auth')) {
          console.log('[SocketService] Error de auth detectado, refrescando token y forzando reconexión...');
          const refreshResult = await refreshAccessToken();
          if (refreshResult) {
            // Forzar reconexión inmediata con token nuevo
            setTimeout(() => this.reconnectWithNewToken(), 500);
          }
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
          queueNotificationSound();
        }
      });

      this.setupEventListeners();
      this.socket.connect();
      return true;
    } catch (error:any) {
      console.log('[SocketService] Error al conectar Socket.IO:', error);
      this._connected = false;
      this._connecting = false;
      this.notifyConnectionListeners();
      return false;
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

    this.socket.on(SocketEventType.DELIVERY_STATUS_UPDATED, ({data}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Estado de entrega actualizado (delivery-status-updated)');
      this.notifyListeners(SocketEventType.DELIVERY_STATUS_UPDATED, adaptDeliveriesToAdapter([data])[0]);
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
    this._connecting = false;
    this._reconnecting = false;
    if (this.socket) {
      console.log('[SocketService] Desconectando Socket.IO...');
      this.socket.disconnect();
      this._connected = false;
      this.notifyConnectionListeners();
    }
  }

  /**
   * Reconecta el socket con un token nuevo después de un refresh proactivo.
   * Desconecta la conexión actual y crea una nueva que leerá el token
   * actualizado de authStore via el callback `auth`.
   */
  private async reconnectWithNewToken(): Promise<void> {
    if (this._reconnecting) {
      console.log('[SocketService] Reconexión ya en progreso, ignorando.');
      return;
    }
    if (!this._connected || !this.socket) {
      console.log('[SocketService] Socket no conectado, no es necesario reconectar.');
      return;
    }

    this._reconnecting = true;
    console.log('[SocketService] Reconectando socket con token fresco...');

    try {
      // Desconectar socket actual
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this._connected = false;
      this.notifyConnectionListeners();

      // Pequeña delay para evitar reconexiones demasiado rápidas
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Reconectar — connect() leerá el token nuevo de authStore
      await this.connect();
      console.log('[SocketService] Reconexión exitosa con token fresco');
    } catch (error: any) {
      console.log('[SocketService] Error durante reconexión con token fresco:', error);
    } finally {
      this._reconnecting = false;
    }
  }

  // ---------- Refresco proactivo de token ----------

  /**
   * Inicia un intervalo de 60 s que comprueba si el token está por vencer
   * (70-80% del TTL consumido) y lo refresca proactivamente, sin necesitar
   * una petición HTTP del usuario.
   * También escucha el evento token.expiring_soon del backend para refresh
   * inmediato sin esperar al próximo ciclo de polling.
   */
  private startProactiveRefresh(): void {
    this.stopProactiveRefresh();
    this.proactiveRefreshAttempt = 0;

    // Listen for backend proactive expiration warning
    this.socket?.on('token.expiring_soon', async (data: { expiresIn: number; message: string }) => {
      console.log(`[SocketService] token.expiring_soon recibido, expiresIn: ${data.expiresIn}s`);
      this.proactiveRefreshAttempt++;
      const result = await refreshAccessToken();
      if (result && this._connected) {
        console.log('[SocketService] Token refrescado por token.expiring_soon, reconectando socket...');
        await this.reconnectWithNewToken();
      }
    });

    // Polling fallback: check every 60s if token is at 70-80% of TTL
    this.proactiveRefreshTimer = setInterval(async () => {
      this.proactiveRefreshAttempt++;
      const accessToken = authStore.getAccessToken();
      if (accessToken && isTokenExpiringSoon(accessToken, 0.75)) {
        console.log(`[SocketService] Token al 75% del TTL, refrescando proactivamente... (intento #${this.proactiveRefreshAttempt})`);
        const result = await refreshAccessToken();
        if (result && this._connected) {
          console.log('[SocketService] Token refrescado proactivamente, reconectando socket...');
          await this.reconnectWithNewToken();
        }
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

  /**
   * Emite un evento y espera la respuesta del servidor con timeout.
   * Usa la API de Socket.IO v4 timeout().emit().
   */
  emitWithAck(event: string, data: any, timeoutMs = 10000): Promise<any> {
    return new Promise((resolve) => {
      if (!this.socket?.connected) {
        console.warn(`[SocketService] No se pudo emitir ${event}: Socket no conectado`);
        resolve(null);
        return;
      }

      const timer = setTimeout(() => {
        console.warn(`[SocketService] Timeout esperando respuesta de ${event} (${timeoutMs}ms)`);
        resolve(null);
      }, timeoutMs);

      this.socket.timeout(timeoutMs).emit(event, data, (err: any, response: any) => {
        clearTimeout(timer);
        if (err) {
          console.error(`[SocketService] Error en emitWithAck(${event}):`, err.message || err);
          resolve(null);
          return;
        }
        resolve(response);
      });
    });
  }

  isConnected(): boolean {
    return this._connected;
  }
}

export const socketService = new SocketService();