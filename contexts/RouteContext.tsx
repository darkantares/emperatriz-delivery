import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useOsrmTrip } from '@/hooks/useOsrmTrip';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';

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
  const { data: tripData, loading: tripLoading, error: tripError, fetchTrip } = useOsrmTrip();
  const [showTripMap, setShowTripMap] = useState<boolean>(false);
  const [tripDeliveries, setTripDeliveries] = useState<DeliveryItemAdapter[]>([]);

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

  // Método para iniciar rutas
  const startRoutes = async (allDeliveries: DeliveryItemAdapter[]) => {
    console.log('[RouteContext] Iniciando cálculo de rutas...');

    const routeData = prepareRouteData(allDeliveries);
    if (!routeData) {
      throw new Error('No hay entregas disponibles con coordenadas válidas');
    }

    const { pendingDeliveries, coordinates } = routeData;

    console.log('[RouteContext] Coordenadas a enviar:', coordinates);

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
    tripLoading,
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