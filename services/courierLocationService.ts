import * as Location from 'expo-location';
import { socketService } from './websocketService';

/**
 * Interface para la ubicación del mensajero
 */
interface CourierLocation {
  courierId: number;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  speed?: number;
  heading?: number;
}

/**
 * Configuración del servicio de ubicación
 */
interface LocationTrackingConfig {
  /**
   * Intervalo mínimo entre actualizaciones en milisegundos
   * Por defecto: 15000ms (15 segundos)
   */
  updateInterval: number;

  /**
   * Distancia mínima de movimiento en metros para enviar actualización
   * Por defecto: 10 metros
   */
  minDistance: number;

  /**
   * Si debe iniciar automáticamente al conectarse el WebSocket
   * Por defecto: true
   */
  autoStart: boolean;
}

const DEFAULT_CONFIG: LocationTrackingConfig = {
  updateInterval: 15000, // 15 segundos
  minDistance: 10, // 10 metros
  autoStart: true,
};

/**
 * Servicio para gestionar el tracking de ubicación del mensajero
 * Obtiene la ubicación GPS y la envía al backend vía WebSocket
 * 
 * Características:
 * - Throttling para evitar consumo excesivo de batería
 * - Solo envía si el WebSocket está conectado
 * - Maneja permisos de ubicación
 * - Control de frecuencia de envío
 */
class CourierLocationTrackingService {
  private isTracking: boolean = false;
  private lastSentLocation: Location.LocationObject | null = null;
  private lastSentTime: number = 0;
  private config: LocationTrackingConfig = DEFAULT_CONFIG;
  private locationSubscription: Location.LocationSubscription | null = null;
  private userId: number | null = null;

  /**
   * Inicializa el servicio con la configuración
   */
  initialize(config?: Partial<LocationTrackingConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log('[LocationTracking] Inicializado con config:', this.config);
  }

  /**
   * Establece el ID del usuario/mensajero
   */
  setUserId(userId: number) {
    this.userId = userId;
    console.log('[LocationTracking] User ID establecido:', userId);
  }

  /**
   * Solicita permisos de ubicación
   * @returns true si los permisos fueron otorgados, false en caso contrario
   */
  async requestPermissions(): Promise<boolean> {
    try {
      console.log('[LocationTracking] Solicitando permisos de ubicación...');

      const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();

      if (foregroundStatus !== 'granted') {
        console.warn('[LocationTracking] Permisos de ubicación denegados');
        return false;
      }

      console.log('[LocationTracking] Permisos de ubicación otorgados');
      return true;
    } catch (error) {
      console.error('[LocationTracking] Error al solicitar permisos:', error);
      return false;
    }
  }

  /**
   * Verifica si los permisos de ubicación están otorgados
   */
  async hasPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('[LocationTracking] Error al verificar permisos:', error);
      return false;
    }
  }

  /**
   * Inicia el tracking de ubicación
   */
  async startTracking(): Promise<boolean> {
    try {
      if (this.isTracking) {
        console.log('[LocationTracking] Ya está en tracking');
        return true;
      }

      if (!this.userId) {
        console.warn('[LocationTracking] No se puede iniciar tracking sin userId');
        return false;
      }

      // Verificar permisos
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        const granted = await this.requestPermissions();
        if (!granted) {
          console.warn('[LocationTracking] No se puede iniciar sin permisos');
          return false;
        }
      }

      // Verificar que el WebSocket esté conectado
      if (!socketService.isConnected()) {
        console.warn('[LocationTracking] WebSocket no conectado, no se inicia tracking');
        return false;
      }

      console.log('[LocationTracking] Iniciando tracking de ubicación...');

      // Iniciar tracking de ubicación
      this.locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Balanced, // Balance entre precisión y batería
          timeInterval: this.config.updateInterval,
          distanceInterval: this.config.minDistance,
        },
        (location) => {
          this.handleLocationUpdate(location);
        }
      );

      this.isTracking = true;
      console.log('[LocationTracking] Tracking iniciado correctamente');
      return true;
    } catch (error) {
      console.error('[LocationTracking] Error al iniciar tracking:', error);
      this.isTracking = false;
      return false;
    }
  }

  /**
   * Detiene el tracking de ubicación
   */
  async stopTracking(): Promise<void> {
    try {
      if (!this.isTracking) {
        console.log('[LocationTracking] No hay tracking activo');
        return;
      }

      console.log('[LocationTracking] Deteniendo tracking de ubicación...');

      if (this.locationSubscription) {
        this.locationSubscription.remove();
        this.locationSubscription = null;
      }

      this.isTracking = false;
      this.lastSentLocation = null;
      this.lastSentTime = 0;

      console.log('[LocationTracking] Tracking detenido');
    } catch (error) {
      console.error('[LocationTracking] Error al detener tracking:', error);
    }
  }

  /**
   * Maneja las actualizaciones de ubicación
   */
  private handleLocationUpdate(location: Location.LocationObject) {
    try {
      // Verificar que el WebSocket esté conectado
      if (!socketService.isConnected()) {
        console.log('[LocationTracking] WebSocket desconectado, no se envía ubicación');
        return;
      }

      // Verificar throttling por tiempo
      const now = Date.now();
      const timeSinceLastSent = now - this.lastSentTime;

      if (timeSinceLastSent < this.config.updateInterval) {
        console.log('[LocationTracking] Throttling por tiempo, omitiendo envío');
        return;
      }

      // Verificar throttling por distancia
      if (this.lastSentLocation) {
        const distance = this.calculateDistance(
          this.lastSentLocation.coords.latitude,
          this.lastSentLocation.coords.longitude,
          location.coords.latitude,
          location.coords.longitude
        );

        if (distance < this.config.minDistance) {
          console.log('[LocationTracking] Throttling por distancia, omitiendo envío');
          return;
        }
      }

      // Enviar ubicación al backend
      this.sendLocationToBackend(location);

      // Actualizar estado
      this.lastSentLocation = location;
      this.lastSentTime = now;
    } catch (error) {
      console.error('[LocationTracking] Error al manejar actualización de ubicación:', error);
    }
  }

  /**
   * Envía la ubicación al backend vía WebSocket
   */
  private sendLocationToBackend(location: Location.LocationObject) {
    try {
      if (!this.userId) {
        console.warn('[LocationTracking] No se puede enviar ubicación sin userId');
        return;
      }

      const payload: CourierLocation = {
        courierId: this.userId,
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        accuracy: location.coords.accuracy || 0,
        timestamp: new Date(location.timestamp).toISOString(),
        speed: location.coords.speed ?? undefined,
        heading: location.coords.heading ?? undefined,
      };

      const sent = socketService.emit('courier.location.update', payload);

      if (sent) {
        console.log(
          `[LocationTracking] Ubicación enviada: (${payload.lat.toFixed(6)}, ${payload.lng.toFixed(6)}) ` +
          `accuracy: ${payload.accuracy.toFixed(1)}m`
        );
      } else {
        console.warn('[LocationTracking] No se pudo enviar ubicación');
      }
    } catch (error) {
      console.error('[LocationTracking] Error al enviar ubicación:', error);
    }
  }

  /**
   * Calcula la distancia entre dos coordenadas en metros (fórmula de Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Radio de la Tierra en metros
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Obtiene el estado actual del tracking
   */
  getTrackingStatus(): {
    isTracking: boolean;
    lastSentLocation: Location.LocationObject | null;
    lastSentTime: number;
    hasUserId: boolean;
  } {
    return {
      isTracking: this.isTracking,
      lastSentLocation: this.lastSentLocation,
      lastSentTime: this.lastSentTime,
      hasUserId: this.userId !== null,
    };
  }

  /**
   * Obtiene la ubicación actual sin iniciar tracking continuo
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermissions = await this.hasPermissions();
      if (!hasPermissions) {
        console.warn('[LocationTracking] No hay permisos para obtener ubicación');
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      return location;
    } catch (error) {
      console.error('[LocationTracking] Error al obtener ubicación actual:', error);
      return null;
    }
  }
}

export const courierLocationTracking = new CourierLocationTrackingService();
