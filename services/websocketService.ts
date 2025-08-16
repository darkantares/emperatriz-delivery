import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getBaseUrl } from './api';

// URL del servidor Socket.IO
const SOCKET_URL = getBaseUrl();

// Tipos de eventos disponibles
export enum SocketEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  CONNECT_ERROR = 'connect_error',
  DRIVER_ASSIGNED = 'driver-assigned',
  DELIVERY_UPDATED = 'delivery-updated',
  DELIVERY_STATUS_CHANGED = 'delivery-status-changed',
}

// Clase para manejar la conexión Socket.IO
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

  constructor() {
    // La conexión se iniciará explícitamente cuando sea necesario
  }

  // Getter para saber si el socket está conectado
  get connected(): boolean {
    return this._connected;
  }

  // Conectar el socket
  async connect() {
    try {
      console.log("Iniciando conexión Socket.IO...");
      
      // Obtener el token de autenticación
      const token = await AsyncStorage.getItem('auth_token');
      if (!token) {
        console.error("No se pudo iniciar Socket.IO: token no disponible");
        return false;
      }

      // Si ya hay un socket, desconectarlo
      if (this.socket) {
        this.socket.disconnect();
      }

      // Crear nueva instancia de socket
      this.socket = io(SOCKET_URL, {
        ...this.options,
        auth: { token },
        transports: ['websocket'],
      });

      // Configurar eventos básicos
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

      // Configurar listeners para eventos específicos de la aplicación
      this.setupEventListeners();

      // Iniciar conexión
      this.socket.connect();
      return true;
    } catch (error) {
      console.error("Error al conectar Socket.IO:", error);
      this._connected = false;
      this.notifyConnectionListeners();
      return false;
    }
  }

  // Configurar listeners para eventos específicos de la aplicación
  private setupEventListeners() {
    if (!this.socket) return;

    // Evento cuando se asigna un conductor a una entrega
    this.socket.on(SocketEventType.DRIVER_ASSIGNED, (data) => {
      console.log('Evento recibido - Conductor asignado:', data);
      this.notifyListeners(SocketEventType.DRIVER_ASSIGNED, data);
    });

    // Evento cuando se actualiza una entrega
    this.socket.on(SocketEventType.DELIVERY_UPDATED, (data) => {
      console.log('Evento recibido - Entrega actualizada:', data);
      this.notifyListeners(SocketEventType.DELIVERY_UPDATED, data);
    });

    // Evento cuando cambia el estado de una entrega
    this.socket.on(SocketEventType.DELIVERY_STATUS_CHANGED, (data) => {
      console.log('Evento recibido - Estado de entrega cambiado:', data);
      this.notifyListeners(SocketEventType.DELIVERY_STATUS_CHANGED, data);
    });
  }

  // Desconectar el socket
  disconnect() {
    if (this.socket) {
      console.log("Desconectando Socket.IO...");
      this.socket.disconnect();
      this._connected = false;
      this.notifyConnectionListeners();
    }
  }

  // Registrar un listener para un evento específico
  on(event: string, callback: Function) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)?.add(callback);
  }

  // Eliminar un listener para un evento específico
  off(event: string, callback: Function) {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  // Registrar un listener para cambios en el estado de conexión
  onConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.add(callback);
    // Notificar inmediatamente el estado actual
    callback(this._connected);
  }

  // Eliminar un listener de cambios en el estado de conexión
  offConnectionChange(callback: (connected: boolean) => void) {
    this.connectionListeners.delete(callback);
  }

  // Notificar a los listeners de un evento específico
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

  // Notificar a los listeners de cambios en la conexión
  private notifyConnectionListeners() {
    this.connectionListeners.forEach(callback => {
      try {
        callback(this._connected);
      } catch (error) {
        console.error('Error en listener de conexión:', error);
      }
    });
  }

  // Enviar un evento al servidor
  emit(event: string, data?: any) {
    if (this.socket?.connected) {
      console.log(`Emitiendo evento ${event}:`, data);
      this.socket.emit(event, data);
      return true;
    }
    console.warn(`No se pudo emitir ${event}: Socket no conectado`);
    return false;
  }

  // Verificar si el socket está conectado
  isConnected(): boolean {
    return this._connected;
  }
}

// Exportar una instancia única del servicio
export const socketService = new SocketService();