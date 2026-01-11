/**
 * EJEMPLOS DE USO - Courier Location Tracking (App Móvil)
 * 
 * Este archivo contiene ejemplos de cómo usar el servicio de tracking
 * de ubicación en diferentes escenarios de la app móvil.
 * 
 * NO es código de producción, solo ejemplos para referencia.
 */

import React, { useEffect, useState } from 'react';
import { View, Text, Button, Alert } from 'react-native';
import { courierLocationTracking } from '@/services/courierLocationService';
import * as Location from 'expo-location';

/**
 * EJEMPLO 1: Uso básico con configuración personalizada
 * 
 * Caso de uso: Configurar el tracking con parámetros específicos
 */
export const BasicUsageExample: React.FC = () => {
  useEffect(() => {
    // Configurar el servicio al montar el componente
    courierLocationTracking.initialize({
      updateInterval: 20000,  // 20 segundos
      minDistance: 15,        // 15 metros
      autoStart: true,
    });

    // Establecer el userId (normalmente viene del contexto de autenticación)
    courierLocationTracking.setUserId(123);

    // El tracking se iniciará automáticamente cuando el WebSocket se conecte
    // (gestionado por AuthContext)
  }, []);

  return (
    <View>
      <Text>Tracking configurado automáticamente</Text>
    </View>
  );
};

/**
 * EJEMPLO 2: Control manual del tracking
 * 
 * Caso de uso: Permitir al mensajero pausar/reanudar el tracking
 */
export const ManualControlExample: React.FC = () => {
  const [isTracking, setIsTracking] = useState(false);

  const handleStartTracking = async () => {
    const started = await courierLocationTracking.startTracking();
    
    if (started) {
      setIsTracking(true);
      Alert.alert('Éxito', 'Tracking de ubicación iniciado');
    } else {
      Alert.alert(
        'Error',
        'No se pudo iniciar el tracking. Verifica los permisos de ubicación.'
      );
    }
  };

  const handleStopTracking = async () => {
    await courierLocationTracking.stopTracking();
    setIsTracking(false);
    Alert.alert('Tracking pausado', 'Tu ubicación no se está compartiendo');
  };

  return (
    <View style={{ padding: 20 }}>
      {isTracking ? (
        <Button title="Pausar Tracking" onPress={handleStopTracking} />
      ) : (
        <Button title="Iniciar Tracking" onPress={handleStartTracking} />
      )}
    </View>
  );
};

/**
 * EJEMPLO 3: Solicitar permisos de ubicación de forma explícita
 * 
 * Caso de uso: Pantalla de onboarding que solicita permisos
 */
export const PermissionsRequestExample: React.FC = () => {
  const [hasPermissions, setHasPermissions] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const has = await courierLocationTracking.hasPermissions();
    setHasPermissions(has);
  };

  const requestPermissions = async () => {
    const granted = await courierLocationTracking.requestPermissions();
    
    if (granted) {
      setHasPermissions(true);
      Alert.alert(
        'Permisos otorgados',
        'Ahora puedes recibir asignaciones de entregas cercanas a tu ubicación'
      );
    } else {
      setHasPermissions(false);
      Alert.alert(
        'Permisos denegados',
        'Necesitas otorgar permisos de ubicación para trabajar como mensajero',
        [
          {
            text: 'Configuración',
            onPress: () => {
              // Abrir configuración de la app
              // En producción usar Linking.openSettings()
            },
          },
          { text: 'Cancelar', style: 'cancel' },
        ]
      );
    }
  };

  if (hasPermissions === null) {
    return <Text>Verificando permisos...</Text>;
  }

  return (
    <View style={{ padding: 20 }}>
      {hasPermissions ? (
        <View>
          <Text>✅ Permisos de ubicación otorgados</Text>
        </View>
      ) : (
        <View>
          <Text>❌ Permisos de ubicación no otorgados</Text>
          <Button title="Solicitar Permisos" onPress={requestPermissions} />
        </View>
      )}
    </View>
  );
};

/**
 * EJEMPLO 4: Mostrar estado del tracking en tiempo real
 * 
 * Caso de uso: Dashboard del mensajero mostrando su estado
 */
export const TrackingStatusExample: React.FC = () => {
  const [status, setStatus] = useState({
    isTracking: false,
    lastSentLocation: null as Location.LocationObject | null,
    lastSentTime: 0,
    hasUserId: false,
  });

  useEffect(() => {
    // Actualizar el estado cada segundo
    const interval = setInterval(() => {
      const currentStatus = courierLocationTracking.getTrackingStatus();
      setStatus(currentStatus);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTimeSince = (timestamp: number): string => {
    if (!timestamp) return 'Nunca';

    const seconds = Math.floor((Date.now() - timestamp) / 1000);

    if (seconds < 60) return `${seconds} segundos`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)} minutos`;
    return `${Math.floor(seconds / 3600)} horas`;
  };

  return (
    <View style={{ padding: 20 }}>
      <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 10 }}>
        Estado del Tracking
      </Text>

      <Text>Estado: {status.isTracking ? '🟢 Activo' : '🔴 Pausado'}</Text>
      <Text>Usuario configurado: {status.hasUserId ? 'Sí' : 'No'}</Text>
      <Text>Última actualización: {formatTimeSince(status.lastSentTime)}</Text>

      {status.lastSentLocation && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: 'bold' }}>Última ubicación enviada:</Text>
          <Text>
            Lat: {status.lastSentLocation.coords.latitude.toFixed(6)}
          </Text>
          <Text>
            Lng: {status.lastSentLocation.coords.longitude.toFixed(6)}
          </Text>
          <Text>
            Precisión: {status.lastSentLocation.coords.accuracy?.toFixed(1)}m
          </Text>
        </View>
      )}
    </View>
  );
};

/**
 * EJEMPLO 5: Obtener ubicación actual sin tracking continuo
 * 
 * Caso de uso: Botón "Compartir mi ubicación actual" sin activar tracking
 */
export const GetCurrentLocationExample: React.FC = () => {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [loading, setLoading] = useState(false);

  const handleGetCurrentLocation = async () => {
    setLoading(true);

    const currentLocation = await courierLocationTracking.getCurrentLocation();

    if (currentLocation) {
      setLocation(currentLocation);
      Alert.alert(
        'Ubicación obtenida',
        `Lat: ${currentLocation.coords.latitude.toFixed(6)}\n` +
        `Lng: ${currentLocation.coords.longitude.toFixed(6)}`
      );
    } else {
      Alert.alert(
        'Error',
        'No se pudo obtener la ubicación. Verifica los permisos.'
      );
    }

    setLoading(false);
  };

  return (
    <View style={{ padding: 20 }}>
      <Button
        title={loading ? 'Obteniendo...' : 'Obtener Ubicación Actual'}
        onPress={handleGetCurrentLocation}
        disabled={loading}
      />

      {location && (
        <View style={{ marginTop: 20 }}>
          <Text>Latitud: {location.coords.latitude}</Text>
          <Text>Longitud: {location.coords.longitude}</Text>
          <Text>Precisión: {location.coords.accuracy}m</Text>
          {location.coords.speed && (
            <Text>Velocidad: {location.coords.speed}m/s</Text>
          )}
        </View>
      )}
    </View>
  );
};

/**
 * EJEMPLO 6: Hook personalizado para gestionar tracking
 * 
 * Caso de uso: Reutilizar lógica de tracking en múltiples componentes
 */
export const useLocationTracking = () => {
  const [isTracking, setIsTracking] = useState(false);
  const [hasPermissions, setHasPermissions] = useState(false);

  useEffect(() => {
    checkStatus();
    
    const interval = setInterval(checkStatus, 1000);
    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    const status = courierLocationTracking.getTrackingStatus();
    const permissions = await courierLocationTracking.hasPermissions();
    
    setIsTracking(status.isTracking);
    setHasPermissions(permissions);
  };

  const startTracking = async () => {
    if (!hasPermissions) {
      const granted = await courierLocationTracking.requestPermissions();
      if (!granted) return false;
    }

    const started = await courierLocationTracking.startTracking();
    setIsTracking(started);
    return started;
  };

  const stopTracking = async () => {
    await courierLocationTracking.stopTracking();
    setIsTracking(false);
  };

  return {
    isTracking,
    hasPermissions,
    startTracking,
    stopTracking,
  };
};

// Ejemplo de uso del hook
export const HookUsageExample: React.FC = () => {
  const { isTracking, hasPermissions, startTracking, stopTracking } = useLocationTracking();

  return (
    <View style={{ padding: 20 }}>
      <Text>Permisos: {hasPermissions ? 'Otorgados' : 'No otorgados'}</Text>
      <Text>Tracking: {isTracking ? 'Activo' : 'Pausado'}</Text>

      <View style={{ marginTop: 20 }}>
        {isTracking ? (
          <Button title="Detener" onPress={stopTracking} />
        ) : (
          <Button title="Iniciar" onPress={startTracking} />
        )}
      </View>
    </View>
  );
};

/**
 * EJEMPLO 7: Integración con mapa en tiempo real
 * 
 * Caso de uso: Mostrar la posición del mensajero en un mapa
 */
import MapView, { Marker } from 'react-native-maps';

export const MapTrackingExample: React.FC = () => {
  const [currentLocation, setCurrentLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  useEffect(() => {
    // Actualizar la ubicación cada 5 segundos
    const interval = setInterval(async () => {
      const location = await courierLocationTracking.getCurrentLocation();
      
      if (location) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    }, 5000);

    // Obtener ubicación inicial
    courierLocationTracking.getCurrentLocation().then(location => {
      if (location) {
        setCurrentLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      }
    });

    return () => clearInterval(interval);
  }, []);

  if (!currentLocation) {
    return <Text>Obteniendo ubicación...</Text>;
  }

  return (
    <MapView
      style={{ flex: 1 }}
      initialRegion={{
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }}
    >
      <Marker
        coordinate={currentLocation}
        title="Mi ubicación"
        description="Posición actual del mensajero"
      />
    </MapView>
  );
};

/**
 * NOTAS IMPORTANTES:
 * 
 * 1. El tracking se gestiona automáticamente en AuthContext, NO necesitas
 *    llamar startTracking() manualmente a menos que quieras control explícito
 * 
 * 2. En iOS, el tracking se pausa cuando la app entra en background.
 *    Para tracking en background, necesitas configurar permisos adicionales
 * 
 * 3. SIEMPRE verifica permisos antes de intentar acceder a la ubicación
 * 
 * 4. El throttling (15s, 10m) es para optimizar batería. Ajusta según necesidad
 * 
 * 5. Si el WebSocket se desconecta, el tracking se pausa automáticamente
 * 
 * 6. Los logs en consola son útiles para debugging pero pueden deshabilitarse
 *    en producción para mejor rendimiento
 * 
 * 7. El servicio NO persiste ubicaciones en el dispositivo, solo las envía
 *    al backend
 * 
 * 8. Para testing, usa un simulador con ubicación simulada o un dispositivo real
 */
