import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useOsrmTrip } from '@/hooks/useOsrmTrip';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { DeliveryService } from '@/services/deliveryService';
import { useAuth } from '@/context/AuthContext';
import { OsrmTripResult } from '@/services/osrmService';

interface RouteContextType {
  // Estado
  tripData: any;
  tripLoading: boolean;
  tripError: string | null;
  showTripMap: boolean;
  tripDeliveries: DeliveryItemAdapter[];

  // Métodos
  startRoutes: (allDeliveries: DeliveryItemAdapter[]) => Promise<void>;
  recalculateRoutes: (allDeliveries: DeliveryItemAdapter[]) => Promise<void>;
  closeTripMap: () => void;
  setTripDeliveries: (deliveries: DeliveryItemAdapter[]) => void;
}

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const useRouteContext = () => {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error('useRouteContext must be used within a RouteProvider');
  }
  return context;
};

interface RouteProviderProps {
  children: ReactNode;
}

export const RouteProvider: React.FC<RouteProviderProps> = ({ children }) => {
  const { data: tripData, loading: tripLoading, error: tripError, fetchTrip, setTripData } = useOsrmTrip();
  const [showTripMap, setShowTripMap] = useState<boolean>(false);
  const [tripDeliveries, setTripDeliveries] = useState<DeliveryItemAdapter[]>([]);
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const { user, carrier } = useAuth();

  // Función auxiliar para preparar deliveries y coordenadas
  const prepareRouteData = (allDeliveries: DeliveryItemAdapter[]) => {
    const pendingDeliveries = allDeliveries.filter(delivery => {
      const isPending = delivery.deliveryStatus.title !== IDeliveryStatus.DELIVERED &&
                       delivery.deliveryStatus.title !== IDeliveryStatus.CANCELLED &&
                       delivery.deliveryStatus.title !== IDeliveryStatus.RETURNED;

      const hasCoordinates = delivery.additionalDataNominatim?.lat &&
                            delivery.additionalDataNominatim?.lon;

      return isPending && hasCoordinates;
    });

    if (pendingDeliveries.length === 0) {
      return null;
    }

    const coordinates = pendingDeliveries.map(delivery => ({
      latitude: parseFloat(delivery.additionalDataNominatim.lat),
      longitude: parseFloat(delivery.additionalDataNominatim.lon),
    }));

    return { pendingDeliveries, coordinates };
  };

  // Método para iniciar rutas con optimización del backend
  const startRoutes = async (allDeliveries: DeliveryItemAdapter[]) => {
    console.log('[RouteContext] Iniciando cálculo de rutas optimizadas desde backend...');
    console.log('USER: ', user);
    
    if (!user) {
      throw new Error('Usuario no autenticado');
    }

    const carrierId = carrier?.id;
    if (!carrierId) {
      console.error('[RouteContext] Usuario autenticado sin carrier válido:', {
        userId: user.id,
        carrier,
      });
      throw new Error('El usuario autenticado no tiene un carrier/courier asociado.');
    }

    setIsOptimizing(true);

    try {
      // Paso 0: Obtener ubicación actual del courier
      const { courierLocationTracking } = await import('@/services/courierLocationService');
      const currentLocation = await courierLocationTracking.getCurrentLocation();

      if (!currentLocation) {
        throw new Error('No se pudo obtener la ubicación actual del mensajero');
      }

      console.log('[RouteContext] Ubicación actual obtenida:', {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude
      });

      // Paso 1: Obtener ruta optimizada desde el backend con ubicación actual
      console.log('[RouteContext] Solicitando ruta optimizada al backend...');
      console.log('CARRIER:', carrier);
      
      const response = await DeliveryService.getOptimizedRoute(carrierId, {
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude
      });

      if (!response.success || !response.data) {
        console.warn('[RouteContext] No se pudo obtener ruta optimizada del backend:', response.error);
        throw new Error(response.error || 'No se pudo obtener ruta optimizada');
      }

      console.log('[RouteContext] Ruta optimizada recibida del backend:', response.data);

      // Paso 2: Preparar deliveries filtrados
      const routeData = prepareRouteData(allDeliveries);
      if (!routeData) {
        throw new Error('No hay entregas disponibles con coordenadas válidas');
      }

      const { pendingDeliveries } = routeData;
      setTripDeliveries(pendingDeliveries);

      // Paso 3: Usar la geometría del backend directamente
      // El backend ya calculó con OSRM, solo necesitamos mostrar el resultado
      const optimizedRoute = response.data;
      
      // Convertir a formato compatible con el mapa
      const tripDataFromBackend: OsrmTripResult = {
        code: 'Ok',
        trips: [{
          geometry: optimizedRoute.geometry,
          distance: optimizedRoute.totalDistance,
          duration: optimizedRoute.totalDuration,
          legs: [],
          weight_name: 'routability',
          weight: optimizedRoute.totalDuration,
        }],
        waypoints: optimizedRoute.waypoints.map((wp: any, index: number) => ({
          waypoint_index: index,
          trips_index: 0,
          location: [wp.location.lng, wp.location.lat],
          name: wp.address,
          distance: 0,
          hint: '',
        }))
      };

      setTripData(tripDataFromBackend);

      console.log('[RouteContext] ✅ Ruta optimizada cargada correctamente');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[RouteContext] Error al cargar ruta optimizada:', {
        errorMessage,
        error,
      });
      throw new Error(errorMessage);
    } finally {
      setIsOptimizing(false);
    }
  };

  // Método para recalcular rutas
  const recalculateRoutes = async (allDeliveries: DeliveryItemAdapter[]) => {
    if (!showTripMap) {
      console.log('[RouteContext] TripMap no está visible, no se recalcula ruta');
      return;
    }

    console.log('[RouteContext] Recalculando rutas debido a nueva asignación...');

    const routeData = prepareRouteData(allDeliveries);
    if (!routeData) {
      console.log('[RouteContext] No hay entregas pendientes para recalcular ruta');
      return;
    }

    const { pendingDeliveries, coordinates } = routeData;

    setTripDeliveries(pendingDeliveries);

    await fetchTrip({
      coordinates,
      source: 'first',
      destination: 'last',
      roundtrip: false,
      geometries: 'geojson',
      overview: 'full',
    });
  };

  // Método para cerrar el mapa
  const closeTripMap = () => {
    setShowTripMap(false);
  };

  // Efecto para abrir el mapa cuando se recibe tripData
  React.useEffect(() => {
    if (tripData) {
      console.log('========================================');
      console.log('[RouteContext] RUTA OPTIMIZADA RECIBIDA:');
      console.log('========================================');
      console.log('Código de respuesta:', tripData.code);
      console.log('Número de trips:', tripData.trips?.length);
      console.log('Datos completos del trip:', tripData);
      console.log('========================================');
      setShowTripMap(true);
    }
    if (tripError) {
      console.error('[RouteContext] Error en trip OSRM:', tripError);
    }
  }, [tripData, tripError]);

  const value: RouteContextType = {
    tripData,
    tripLoading: isOptimizing || tripLoading,
    tripError,
    showTripMap,
    tripDeliveries,
    startRoutes,
    recalculateRoutes,
    closeTripMap,
    setTripDeliveries,
  };

  return (
    <RouteContext.Provider value={value}>
      {children}
    </RouteContext.Provider>
  );
};