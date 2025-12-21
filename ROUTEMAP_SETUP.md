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
   - Info: distancia y duración
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
- ✅ Polyline de la ruta (color primario)
- ✅ Marker de origen (verde)
- ✅ Marker de destino (rojo)
- ✅ Ubicación actual del usuario (punto azul)
- ✅ Botón "Mi ubicación"
- ✅ Panel de información (distancia y duración)

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

### Error de decodificación polyline
```
Error: Invalid polyline
```
- ✅ Verifica que OSRM devuelva geometría en formato polyline (no geojson)
- ✅ En el backend, asegúrate de no usar `geometries=geojson`

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
✅ No depender de servicios de pago  
✅ Deployar sin preocupaciones de facturación  
✅ Escalar sin límites artificiales  
✅ Mantener privacidad de usuarios  

**Todo 100% gratuito y open source.**
