# Configuración del Componente RouteMap

## Descripción
El componente `RouteMap` muestra en un mapa interactivo la ruta que debe seguir el mensajero, usando:
- **OpenStreetMap (OSM)** - Mapas gratuitos y de código abierto
- **OSRM (Open Source Routing Machine)** - Motor de rutas gratuito

**✅ Completamente gratuito - Sin API Keys - Sin facturación externa**

## Dependencias instaladas

Las siguientes dependencias ya están instaladas en el proyecto:

```bash
npx expo install react-native-maps expo-location
npm install @mapbox/polyline
npm install --save-dev @types/mapbox__polyline
```

### Paquetes incluidos:
- **react-native-maps** - Componente de mapa para React Native/Expo
- **expo-location** - Para obtener la ubicación del dispositivo  
- **@mapbox/polyline** - Para decodificar la geometría polyline de OSRM
- **@types/mapbox__polyline** - Tipos de TypeScript para polyline

## ¿Por qué OpenStreetMap?

### Ventajas:
- ✅ **100% Gratuito** - Sin costos ocultos ni límites de uso
- ✅ **Sin API Key** - No requiere registro ni configuración externa
- ✅ **Código Abierto** - Datos mantenidos por la comunidad global
- ✅ **Sin facturación** - No hay riesgo de cargos inesperados
- ✅ **Compatible** - Funciona en Android, iOS y Expo Go

### vs Google Maps:
| Característica | OpenStreetMap | Google Maps |
|----------------|---------------|-------------|
| Costo | Gratuito | $200 USD gratis/mes, luego pago |
| API Key | No requiere | Obligatoria |
| Configuración | Inmediata | Requiere cuenta Google Cloud |
| Límites | Sin límites | 28,000 cargas/mes gratis |
| Privacidad | Mejor | Tracking de Google |

## Cómo funciona

### 1. Obtención de la ruta (OSRM)
El hook `useOsrmRoute` consulta tu servidor OSRM que devuelve:
```typescript
{
  code: "Ok",
  routes: [{
    geometry: "...polyline_encoded...",  // Ruta codificada
    distance: 5420,                      // Metros
    duration: 890                        // Segundos
  }],
  waypoints: [...]
}
```

### 2. Decodificación de la geometría
OSRM devuelve la ruta en formato **polyline** (cadena comprimida). El componente usa `@mapbox/polyline` para decodificarla:

```typescript
// Polyline codificado: "u{~vFvyys@..."
const decoded = polyline.decode(route.geometry);
// Resultado: [[18.4928, -69.7826], [18.4930, -69.7824], ...]

const coordinates = decoded.map(([lat, lng]) => ({
  latitude: lat,
  longitude: lng
}));
```

### 3. Renderizado en OpenStreetMap
El componente usa `UrlTile` para cargar tiles de OpenStreetMap:
```typescript
<MapView>
  <UrlTile
    urlTemplate="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
    maximumZ={19}
  />
  <Polyline coordinates={coordinates} strokeColor="#FF0000" />
  <Marker coordinate={origin} pinColor="green" />
  <Marker coordinate={destination} pinColor="red" />
</MapView>
```

## Permisos configurados

Los siguientes permisos están configurados en `app.json`:

### Android:
```json
"permissions": [
  "android.permission.ACCESS_FINE_LOCATION",
  "android.permission.ACCESS_COARSE_LOCATION"
]
```

### iOS:
```json
"infoPlist": {
  "NSLocationWhenInUseUsageDescription": "Esta aplicación necesita acceso a tu ubicación para mostrar rutas de entrega.",
  "NSLocationAlwaysUsageDescription": "Esta aplicación necesita acceso a tu ubicación para mostrar rutas de entrega."
}
```

## Uso en la aplicación

### Modo desarrollo (__DEV__)

En `AppStateScreen.tsx` hay 3 botones de prueba:

1. **"Refrescar entregas"** (inferior) - Actualiza la lista de entregas
2. **"Probar Ruta OSRM"** (medio) - Obtiene ruta desde tu ubicación hasta punto de prueba
3. **"Ver Mapa"** (superior) - Abre modal con el mapa y la ruta

### Flujo de uso:
```
1. Usuario presiona "Probar Ruta OSRM"
   ↓
2. App obtiene ubicación actual (expo-location)
   ↓
3. Hook useOsrmRoute consulta backend OSRM
   ↓
4. Backend devuelve ruta con geometry polyline
   ↓
5. Aparece botón "Ver Mapa"
   ↓
6. Usuario presiona "Ver Mapa"
   ↓
7. Modal muestra RouteMap con:
   - Tiles de OpenStreetMap
   - Ruta dibujada (Polyline)
   - Marker de origen (verde)
   - Marker de destino (rojo)
   - Marker de posición actual (azul)
   - Info: distancia y duración
   ↓
8. Usuario presiona "Iniciar Viaje"
   ↓
9. Simulación dinámica tipo Uber:
   - Posición actual se mueve cada 2 segundos
   - Polyline verde muestra progreso
   - Distancia/duración se actualizan en tiempo real
   - Si hay desviación >50m, recalcula ruta automáticamente
   - Nuevo polyline morado muestra ruta recalculada
   ↓
10. Usuario presiona "Detener Viaje"
    - Simulación se detiene
    - Se puede reiniciar cuando se desee
```

### Integración programática:

```typescript
import { RouteMap } from '@/components/RouteMap';
import { useOsrmRoute } from '@/hooks/useOsrmRoute';

function MyComponent() {
  const { data, loading, error, fetchRoute } = useOsrmRoute();
  const [showMap, setShowMap] = useState(false);

  const handleGetRoute = async () => {
    await fetchRoute({
      origin: { latitude: 18.5, longitude: -69.9 },
      destination: { latitude: 18.4928592, longitude: -69.7826263 },
      steps: true,
    });
    setShowMap(true);
  };

  return (
    <View>
      <Button title="Obtener Ruta" onPress={handleGetRoute} />
      
      <Modal visible={showMap} onRequestClose={() => setShowMap(false)}>
        <RouteMap 
          routeData={data} 
          loading={loading} 
          error={error} 
        />
      </Modal>
    </View>
  );
}
```

## Estructura de archivos

### Archivos principales:
- **`components/RouteMap.tsx`** - Componente de mapa con OpenStreetMap
- **`hooks/useOsrmRoute.ts`** - Hook para obtener rutas de OSRM
- **`services/osrmService.ts`** - Servicio para consultar backend OSRM
- **`components/states/AppStateScreen.tsx`** - Integración con botones de prueba

### Flujo de datos:
```
AppStateScreen (UI)
    ↓ fetchRoute()
useOsrmRoute (Hook)
    ↓ osrmService.getRoute()
osrmService (Service)
    ↓ api.get()
Backend OSRM
    ↓ respuesta JSON
RouteMap (Componente)
    ↓ polyline.decode()
OpenStreetMap (Visualización)
```

## Estructura de datos OSRM

### Request:
```typescript
{
  origin: { latitude: 18.5, longitude: -69.9 },
  destination: { latitude: 18.49, longitude: -69.78 },
  steps: true
}
```

### Response:
```typescript
{
  code: "Ok",
  routes: [{
    geometry: "u{~vFvyys@fA_@...",     // Polyline encoded
    distance: 5420.3,                   // Metros
    duration: 891.2,                    // Segundos
    legs: [...],
    weight: 891.2,
    weight_name: "duration"
  }],
  waypoints: [
    { location: [-69.9, 18.5], name: "..." },
    { location: [-69.78, 18.49], name: "..." }
  ]
}
```

## Compilar la aplicación

No requiere configuración adicional. Solo compila normalmente:

```bash
# Desarrollo con Expo Go (funciona inmediatamente)
npx expo start

# Build de Android
npx expo run:android

# Build de iOS
npx expo run:ios

# Producción
eas build --platform android
eas build --platform ios
```

## Tiles de OpenStreetMap

### Servidor por defecto:
```
https://tile.openstreetmap.org/{z}/{x}/{y}.png
```

### Alternativas (opcionales):
Si OpenStreetMap está lento, puedes usar otros proveedores gratuitos:

```typescript
// Carto Light (más limpio)
<UrlTile urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png" />

// Carto Dark (tema oscuro)
<UrlTile urlTemplate="https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png" />

// Humanitarian (mejor para zonas rurales)
<UrlTile urlTemplate="https://tile-a.openstreetmap.fr/hot/{z}/{x}/{y}.png" />
```

Para cambiar el proveedor, edita [components/RouteMap.tsx](components/RouteMap.tsx):
```typescript
<UrlTile
  urlTemplate="URL_AQUI"
  maximumZ={19}
  flipY={false}
/>
```

## Características del componente RouteMap

### Props:
```typescript
interface RouteMapProps {
  routeData: OsrmRouteResult | null;  // Datos de OSRM
  loading?: boolean;                   // Estado de carga
  error?: string | null;               // Mensaje de error
}
```

### Renderizado:
- ✅ Mapa con tiles de OpenStreetMap
- ✅ Polyline de la ruta original (color primario)
- ✅ Polyline de progreso (verde, estilo dashed)
- ✅ Polyline de ruta recalculada (morado/violeta)
- ✅ Marker de origen (verde)
- ✅ Marker de destino (rojo)
- ✅ Marker de posición actual del usuario (azul, animado)
- ✅ Botones de control (Iniciar/Detener viaje)
- ✅ Panel de información (distancia y duración restantes)

### Simulación de viaje tipo Uber:
El componente incluye una simulación dinámica que replica el comportamiento de apps como Uber:

#### Características:
- **Movimiento automático**: La posición del usuario avanza cada 2 segundos siguiendo la ruta
- **Detección de desviación**: Usa fórmula de Haversine para calcular distancia a la ruta
- **Recalculo automático**: Si el usuario se desvía >50 metros, solicita nueva ruta desde posición actual
- **Simulación de desvío**: 20% de probabilidad de desviación aleatoria (±0.001 grados ≈ 110m)
- **Actualización en tiempo real**: Distancia y duración restantes se actualizan dinámicamente
- **Visualización de progreso**: Polyline verde muestra el camino recorrido
- **Control manual**: Botones para iniciar y detener la simulación

#### Cómo funciona:
```typescript
// 1. Al iniciar viaje, se configura un intervalo de 2 segundos
useEffect(() => {
  if (isTraveling && remainingCoordinates.length > 0) {
    intervalRef.current = setInterval(() => {
      // Obtener siguiente punto de la ruta
      const nextPoint = remainingCoordinates[0];
      
      // Simular posible desviación (20% probabilidad)
      const deviatedPoint = simulateDeviation(nextPoint);
      setCurrentPosition(deviatedPoint);
      
      // Verificar si hay desviación significativa (>50m)
      if (isSignificantDeviation(deviatedPoint, nextPoint)) {
        recalculateRoute(deviatedPoint); // Recalcular ruta
      }
      
      // Avanzar al siguiente punto
      updateProgress();
    }, 2000); // Cada 2 segundos
  }
}, [isTraveling, currentIndex]);

// 2. Detección de desviación con Haversine
const calculateDistance = (coord1, coord2) => {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distancia en metros
};

// 3. Recalculo automático desde posición actual
const recalculateRoute = async (currentPos) => {
  await fetchRoute({
    origin: currentPos,
    destination: destination,
    steps: true,
  });
  // La nueva ruta se muestra en morado
};
```

#### Para desarrollo:
- **No requiere movimiento físico**: La simulación avanza automáticamente sin mover el dispositivo
- **Testing rápido**: Observa el comportamiento completo en segundos
- **Reproducible**: Mismo comportamiento en cada ejecución
- **Ajustable**: Modifica el intervalo (2000ms) o umbral de desviación (50m) según necesites

### Estados:
- **Loading**: Muestra `ActivityIndicator` con mensaje "Cargando ruta..."
- **Error**: Muestra mensaje de error en rojo
- **Sin datos**: Muestra "No hay datos de ruta para mostrar"
- **Con datos**: Renderiza el mapa completo

### Tamaño:
- Altura: 60% de la pantalla
- Ancho: 100% de la pantalla
- Región inicial: Centrada en el punto de origen con zoom apropiado

## Política de uso de OpenStreetMap

OpenStreetMap es gratuito pero tiene una [política de uso justo](https://operations.osmfoundation.org/policies/tiles/):

### Límites recomendados:
- ✅ Apps de bajo/medio tráfico: Sin límite
- ✅ Uso normal: Perfectamente aceptable
- ⚠️ Apps de alto tráfico (>10k usuarios): Considera hosting propio

### Para producción a gran escala:
Si tu app crece mucho, considera:
1. **Mapbox** (tier gratuito generoso)
2. **Maptiler** (tier gratuito disponible)
3. **Self-hosting** de tiles OSM

**Para tu caso actual**: El servidor público de OSM es perfecto y completamente gratuito.

## Troubleshooting

### El mapa no se muestra
- ✅ Verifica conexión a internet
- ✅ Revisa logs de consola: `[RouteMap]`
- ✅ Prueba con Expo Go primero

### La ruta no se dibuja
- ✅ Verifica que el backend OSRM esté funcionando
- ✅ Revisa logs: `[useOsrmRoute]` y `[osrmService]`
- ✅ Asegúrate de que `routeData.routes[0].geometry` exista
- ✅ Verifica coordenadas válidas (lat: -90 a 90, lng: -180 a 180)

### La simulación no inicia
- ✅ Verifica que haya una ruta cargada primero ("Probar Ruta OSRM")
- ✅ Presiona "Iniciar Viaje" después de abrir el mapa
- ✅ Revisa logs: `[RouteMap] Iniciando simulación de viaje`
- ✅ Asegúrate de que `decodedCoordinates` tenga al menos 2 puntos

### El recalculo no funciona
- ✅ Verifica umbral de desviación (por defecto 50m)
- ✅ Aumenta probabilidad de desviación en simulateDeviation() si necesitas testear
- ✅ Revisa logs: `[RouteMap] Desviación detectada` y `[RouteMap] Recalculando ruta`
- ✅ Asegúrate de que el backend OSRM responda correctamente

### Error de decodificación polyline
```
Error: Invalid polyline
```
- ✅ Verifica que OSRM devuelva geometría en formato polyline (no geojson)
- ✅ En el backend, asegúrate de no usar `geometries=geojson`

### La simulación no se detiene
- ✅ Presiona "Detener Viaje" para limpiar el intervalo
- ✅ Cierra y vuelve a abrir el modal si persiste
- ✅ Verifica que `intervalRef.current` se limpie en `useEffect` cleanup

### Tiles no cargan
- ✅ Verifica conexión a internet
- ✅ Prueba otra URL de tiles (ver sección "Tiles de OpenStreetMap")
- ✅ Verifica que no haya firewall bloqueando `tile.openstreetmap.org`

### Permisos de ubicación
```
Error: Location permissions denied
```
- ✅ En Android: Ve a Configuración → Apps → Tu App → Permisos → Ubicación
- ✅ En iOS: Configuración → Privacidad → Ubicación → Tu App
- ✅ Asegúrate de llamar `Location.requestForegroundPermissionsAsync()`

## Ventajas de esta implementación

### 💰 Económicas:
- **$0** en costos de mapas
- **$0** en costos de rutas
- **Sin límites** de uso
- **Sin facturación** sorpresa

### 🛠️ Técnicas:
- **Sin API Keys** - Menos configuración
- **Sin dependencias** externas de pago
- **Open Source** - Control total
- **Offline capable** - Puedes cachear tiles

### 🚀 De desarrollo:
- **Setup inmediato** - No requiere cuentas externas
- **Funciona en Expo Go** - Testing rápido
- **Compatible** con Android/iOS
- **Sin restricciones** de producción

## Comparación con Google Maps

| Aspecto | Google Maps | OpenStreetMap (Actual) |
|---------|-------------|------------------------|
| Costo | Requiere facturación | Gratuito |
| API Key | Obligatoria | No requiere |
| Setup | Complejo | Inmediato |
| Límites | 28k cargas/mes | Sin límites |
| Privacidad | Tracking de Google | Mejor privacidad |
| Configuración | Google Cloud Console | 0 pasos |
| Producción | Riesgo de costos | Sin costos |

## Resumen

Esta implementación te permite:

✅ Mostrar mapas sin costo alguno  
✅ Dibujar rutas calculadas por OSRM  
✅ Simular viajes tipo Uber con recalculo dinámico  
✅ No depender de servicios de pago  
✅ Deployar sin preocupaciones de facturación  
✅ Escalar sin límites artificiales  
✅ Mantener privacidad de usuarios  
✅ Testear en desarrollo sin movimiento físico  

**Todo 100% gratuito y open source.**

### Funcionalidades implementadas:
- 🗺️ **Mapa interactivo** con OpenStreetMap
- 🛣️ **Rutas optimizadas** con OSRM
- 🚗 **Simulación dinámica** de viaje (cada 2s)
- 📍 **Tracking en tiempo real** con markers animados
- 🔄 **Recalculo automático** en desvíos >50m
- 📊 **Estadísticas en vivo** (distancia/duración restantes)
- 🎮 **Control manual** (Iniciar/Detener viaje)
- 🎨 **Múltiples polylines** (ruta, progreso, recalculada)
