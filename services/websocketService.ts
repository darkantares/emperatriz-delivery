import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from './api';
// Importar el servicio de notificaciones
import { queueNotification, NotificationType } from './notificationService';
import { IEnterpriseEntity, IUserEntity } from '@/interfaces/auth';
import { IDeliveryAssignmentEntity } from '@/interfaces/delivery/delivery';

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
  DRIVER_ASSIGNED = 'driver-assigned',
  DELIVERY_UPDATED = 'delivery-updated',
  DELIVERY_STATUS_CHANGED = 'delivery-status-changed',
  DELIVERY_REORDERED = 'delivery-reordered',
  DELIVERY_ASSIGNMENT_UPDATED = 'delivery-assignment-updated',
}

class SocketService {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private connectionListeners: Set<Function> = new Set();
  private _connected: boolean = false;

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
      console.log("Iniciando conexión Socket.IO...");

      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.log("No se pudo iniciar Socket.IO: token no disponible");
        return false;
      }

      if (this.socket) {
        this.socket.disconnect();
      }

      this.socket = io(SOCKET_URL, {
        ...this.options,
        auth: { token },
        transports: ['websocket'],
      });

      this.socket.on(SocketEventType.CONNECT, () => {
        console.log('Socket.IO conectado');
        this._connected = true;
        this.notifyConnectionListeners();
      });

      this.socket.on(SocketEventType.DISCONNECT, () => {
        console.log('Socket.IO desconectado');
        this._connected = false;
        this.notifyConnectionListeners();
      });

      this.socket.on(SocketEventType.CONNECT_ERROR, (error) => {
        console.error('Error de conexión Socket.IO:', error);
        this._connected = false;
        this.notifyConnectionListeners();
      });

      this.socket.onAny((event) => {
        if (
          event === SocketEventType.DRIVER_ASSIGNED &&
          event === SocketEventType.DELIVERY_UPDATED &&
          event === SocketEventType.DELIVERY_STATUS_CHANGED &&
          event === SocketEventType.DELIVERY_REORDERED
        ) {
          console.log('Evento recibido:', event);
          queueNotificationSound();
        }
      });

      this.setupEventListeners();

      this.socket.connect();
      return true;
    } catch (error) {
      console.error("Error al conectar Socket.IO:", error);
      this._connected = false;
      this.notifyConnectionListeners();
      return false;
    }
  }


  private setupEventListeners() {
    if (!this.socket) return;

    this.socket.on(SocketEventType.DRIVER_ASSIGNED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Conductor asignado');

      // Encolar una notificación
      queueNotification(
        NotificationType.SUCCESS,
        message,
        `Se te ha asignado la entrega #${data.id}`,
        true
      );

      this.notifyListeners(SocketEventType.DRIVER_ASSIGNED, data);
    });


    this.socket.on(SocketEventType.DELIVERY_UPDATED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Entrega actualizada:', data);

      queueNotification(
        NotificationType.INFO,
        message,
        `Las entregas ha sido actualizada`,
        true
      );

      this.notifyListeners(SocketEventType.DELIVERY_UPDATED, data);
    });


    this.socket.on(SocketEventType.DELIVERY_STATUS_CHANGED, ({data,message}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Estado de entrega cambiado');

      queueNotification(
        NotificationType.INFO,
        message,
        `La entrega #${data.id} ahora está ${data.deliveryStatus.title}`,
        true
      );

      this.notifyListeners(SocketEventType.DELIVERY_STATUS_CHANGED, data);
    });

    this.socket.on(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, ({data}: SocketParam<IDeliveryAssignmentEntity>) => {
      console.log('Evento recibido - Asignación de entrega actualizada');
      this.notifyListeners(SocketEventType.DELIVERY_ASSIGNMENT_UPDATED, data);
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

      this.notifyListeners(SocketEventType.DELIVERY_REORDERED, data);
    });
  }

  disconnect() {
    if (this.socket) {
      console.log("Desconectando Socket.IO...");
      this.socket.disconnect();
      this._connected = false;
      this.notifyConnectionListeners();
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
        } catch (error) {
          console.error(`Error en listener de evento ${event}:`, error);
        }
      });
    }
  }

  private notifyConnectionListeners() {
    this.connectionListeners.forEach(callback => {
      try {
        callback(this._connected);
      } catch (error) {
        console.error('Error en listener de conexión:', error);
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