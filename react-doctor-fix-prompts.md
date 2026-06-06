# React Doctor — Prompts de corrección por fases

> Proyecto: **emperatriz-delivery** · Score actual: **58/100** · Total: 392 issues
> Orden: de mayor impacto a menor. Resuelve una fase antes de pasar a la siguiente.

---

## Fase 1 — Bugs críticos de efectos (efecto sin cleanup + state sincronizado desde props)

> **Por qué primero:** Son los únicos errores marcados con ✖ (errores duros). El de cleanup provoca memory leaks y el de state-sync-on-prop fuerza renders extra con UI obsoleta.

**Prompt 1.1 — Cleanup en useEffect (`app/_layout.tsx:74`)**

```
En `app/_layout.tsx`, en el useEffect que empieza en la línea 74, hay un
subscription, timer o listener que nunca se limpia al desmontar el componente.

Agrega una función de cleanup apropiada:
- Si es un addEventListener: `return () => target.removeEventListener(name, handler)`
- Si es un setInterval/setTimeout: `return () => clearInterval(id)` o `clearTimeout(id)`
- Si es una suscripción: `return unsubscribe`

Muéstrame el bloque del useEffect completo (desde la línea 73 hasta que cierra)
y luego aplica la corrección.
```

**Prompt 1.2 — State sincronizado desde props via effect (41 ocurrencias)**

> Archivos más afectados: `GroupStatusUpdateModal.tsx` (líneas 137, 148, 166-180, 191-196) y `StatusUpdateModal.tsx` (líneas 119, 131, 155-167, 177-182). También `core/hooks/useStatusData.ts:62-64`.

```
En los siguientes archivos tengo useEffects que sincronizan estado a partir de
props (patrón anti-React que fuerza un render extra con UI obsoleta):

- components/status-update/GroupStatusUpdateModal.tsx (líneas 137, 148, 165-180, 191-196)
- components/status-update/StatusUpdateModal.tsx (líneas 119, 131, 154-167, 177-182)
- core/hooks/useStatusData.ts (líneas 62-64)

Para cada uno, aplica la solución correcta según el caso:

1. Si el estado se puede derivar de props durante el render → elimina el useEffect
   y calcula el valor directamente: `const x = fn(prop)`.
2. Si necesitas resetear el estado cuando cambia un prop → usa el patrón de `key`:
   `<Component key={prop} />` en el componente padre.
3. Si el ajuste es inevitable → hazlo inline durante el render con comparación de
   prop anterior:
   ```ts
   const [prevProp, setPrevProp] = useState(prop);
   if (prop !== prevProp) { setPrevProp(prop); setX(...); }
   ```

Analiza uno por uno y propón la solución específica para cada caso.
```

---

## Fase 2 — Bugs de efectos: dependencias faltantes y efectos encadenados

> **Por qué aquí:** 24 + 17 + 8 ocurrencias. Causan bugs de stale closures, renders fantasma y lógica que es imposible de razonar.

**Prompt 2.1 — Missing effect dependencies (24 ocurrencias)**

> Archivos clave: `useTripRouteSync.ts`, `GroupStatusUpdateModal.tsx`, `StatusUpdateModal.tsx`, `useGpsTracking.ts`, `StatsCharts.tsx`, `RecentDeliveries.tsx`, `PayoutHistory.tsx`, `EarningsCard.tsx`, `RouteContext.tsx`, `app/_layout.tsx:175`.

```
Tengo 24 useEffects con dependencias faltantes en los siguientes archivos:

components/trip-map-screen/hooks/useSimulation.ts:96
components/delivery-items/DeliveryItemList.tsx:42
components/status-update/GroupStatusUpdateModal.tsx:139, 151, 211
components/trip-map-screen/hooks/useTripRouteSync.ts:125, 136, 146, 153
app/_layout.tsx:175
components/ganancias/RecentDeliveries.tsx:30, 60
contexts/RouteContext.tsx:261
components/trip-map-screen/hooks/useGpsTracking.ts:142-145, 270
components/ganancias/StatsCharts.tsx:18, 43
components/ganancias/PayoutHistory.tsx:24, 56
components/status-update/StatusUpdateModal.tsx:121, 135, 197
components/ganancias/EarningsCard.tsx:25

Para cada useEffect, NO agregues ciegamente las dependencias al array.
Sigue este proceso:
1. Lee el cuerpo del hook primero.
2. Si la dependencia faltante es `setState` → usa la forma funcional:
   `setState(prev => ...)` y elimínala de deps.
3. Si la dependencia es un objeto/función recreado en cada render → muévela
   dentro del hook o estabilízala con useCallback/useMemo antes de agregarla.
4. Solo agrega al array deps los valores que realmente necesitan relanzar el efecto.

Muéstrame el código actual de cada useEffect antes de proponer el cambio.
```

**Prompt 2.2 — Efectos encadenados que disparan más effects (8 ocurrencias)**

> `GroupStatusUpdateModal.tsx:135,141,188,201` y `StatusUpdateModal.tsx:117,123,174,187`

```
En `components/status-update/GroupStatusUpdateModal.tsx` (líneas 135, 141, 188, 201)
y `components/status-update/StatusUpdateModal.tsx` (líneas 117, 123, 174, 187)
tengo cadenas de useEffects donde uno dispara al siguiente.

Refactoriza para eliminar la cadena:
1. Calcula los valores derivados durante el render (`const isGameOver = round > 5`).
2. Mueve toda la escritura de estado relacionada al event handler que originalmente
   dispara la cadena, no a efectos secundarios.

Muéstrame la cadena completa de efectos involucrados en cada caso y propón
el event handler unificado.
```

**Prompt 2.3 — State updates encadenados a través de effects (17 ocurrencias)**

```
Tengo 17 lugares donde un useEffect reacciona a un cambio de estado y setea
más estado (cadena de computaciones via effects):

components/status-update/GroupStatusUpdateModal.tsx:137, 143, 148, 191-196, 207-208
components/status-update/StatusUpdateModal.tsx:119, 125, 131, 177-182, 193-194
app/(tabs)/index.tsx:132, 133

La regla: "Set all related state together in the event handler that starts it."

Para cada ocurrencia, identifica cuál es el event handler original que dispara
la cadena y consolida todos los setState ahí. Elimina los useEffects intermedios.
```

---

## Fase 3 — Bugs de lógica de eventos y estado mal inicializado

**Prompt 3.1 — Lógica de eventos en effects (19 ocurrencias)**

> `GroupStatusUpdateModal.tsx`, `StatusUpdateModal.tsx`, `useTripRouteSync.ts`, `useWaypointProgression.ts`, `app/(tabs)/index.tsx`

```
Tengo 19 useEffects que contienen lógica que debería estar en event handlers
(están "observando" estado que cambia en respuesta a una acción del usuario):

components/status-update/GroupStatusUpdateModal.tsx:77, 111, 142-144, 195, 202-203
components/trip-map-screen/hooks/useTripRouteSync.ts:25
components/trip-map-screen/hooks/useWaypointProgression.ts:19
components/status-update/StatusUpdateModal.tsx:56, 89, 94, 124, 181, 188-189
app/(tabs)/index.tsx:132

Para cada uno:
1. Identifica el evento del usuario que dispara el cambio de estado que el effect observa.
2. Mueve la lógica del effect directamente al handler de ese evento.
3. Elimina el useEffect.

Trabaja archivo por archivo y muéstrame el before/after de cada caso.
```

**Prompt 3.2 — Estado inicializado desde un mount effect (5 ocurrencias)**

```
En los siguientes archivos se usa un useEffect de montaje vacío `[]` solo para
setear el estado inicial, en lugar de pasarlo directamente a useState():

context/AuthContext.tsx:88
core/hooks/useOTAUpdates.ts:68
app/verify-email.tsx:42
app/login.tsx:54
core/hooks/usePaymentMethods.ts:18

Para cada uno, reemplaza el patrón:
```ts
// ❌ Antes
const [x, setX] = useState(null);
useEffect(() => { setX(computeValue()); }, []);

// ✅ Después
const [x, setX] = useState(() => computeValue()); // lazy init
// o simplemente
const [x, setX] = useState(computeValue());
```

Si el valor depende de SSR/hidratación, usa `useSyncExternalStore()` en su lugar.
```

---

## Fase 4 — Bugs de keys en listas y valores de tiempo en JSX

**Prompt 4.1 — Missing key en listas (4 ocurrencias) + key con Date.now()**

> `NotificationHandler.tsx:50,61,72,83`

```
En `components/NotificationHandler.tsx` (líneas 50, 61, 72, 83) hay elementos
JSX con `key={`...-${Date.now()}`}`. Esto genera dos problemas a la vez:
1. La key cambia en cada render (Date.now() es no estable) → React no puede
   reconciliar la lista correctamente.
2. Date.now() en JSX causa hydration mismatches.

Solución:
- Genera el ID una sola vez al crear el toast, no al renderizar.
- Pásalo como prop o guárdalo en el estado del componente padre.
- Usa ese ID estable como key.

Muéstrame el componente NotificationHandler completo para proponer el refactor.
```

**Prompt 4.2 — Array index como key (5 ocurrencias)**

> `DeliveryModal.tsx:130`, `AssignmentDetailsModal.tsx:114`, `DeliveryProductsList.tsx:64`, `StatsCharts.tsx:77,116`

```
En los siguientes archivos se usa el índice del array como key en listas:

components/DeliveryModal.tsx:130
components/AssignmentDetailsModal.tsx:114
components/DeliveryProductsList.tsx:64
components/ganancias/StatsCharts.tsx:77, 116

Reemplaza `key={index}` por una key estable derivada del item:
- Si el item tiene un id: `key={item.id}`
- Si tiene un slug o nombre único: `key={item.slug}` o `key={item.name}`
- Si no tiene ningún campo único, agrega un `id` al modelo de datos.

Muéstrame la estructura del item en cada caso para elegir la key correcta.
```

**Prompt 4.3 — Valores de tiempo/random en JSX (7 ocurrencias)**

> `NotificationHandler.tsx:50,61,72,83` (se solapa con 4.1) y `GroupStatusUpdateModal.tsx:627-630,636`

```
En `components/status-update/GroupStatusUpdateModal.tsx` (líneas 627-630 y 636)
hay valores de tiempo o random directamente en JSX, lo que causa hydration mismatches.

Solución: mueve el valor a useState + useEffect para que solo corra en el browser:
```ts
const [now, setNow] = useState<number | null>(null);
useEffect(() => { setNow(Date.now()); }, []);
```
O agrega `suppressHydrationWarning` al elemento padre si el mismatch es intencional.

Aplica el patrón correcto según el contexto de cada ocurrencia.
```

---

## Fase 5 — Performance: estado derivado, multiple setState y cascading

**Prompt 5.1 — Estado derivado en effect o copiado a estado (3 + 6 ocurrencias)**

> `GroupStatusUpdateModal.tsx:165`, `useClientOnlyValue.web.ts:7`, `StatusUpdateModal.tsx:154` y `useGanancias.ts:87`, `GroupStatusUpdateModal.tsx:143,204`, `useClientOnlyValue.web.ts:8`, `StatusUpdateModal.tsx:125,190`

```
Tengo 9 lugares donde un valor derivado se calcula en un useEffect y se guarda
en useState, en lugar de calcularse directamente durante el render:

Derived state in effect:
  components/status-update/GroupStatusUpdateModal.tsx:165
  components/useClientOnlyValue.web.ts:7
  components/status-update/StatusUpdateModal.tsx:154

Derived value copied to state:
  core/hooks/useGanancias.ts:87
  components/status-update/GroupStatusUpdateModal.tsx:143, 204
  components/useClientOnlyValue.web.ts:8
  components/status-update/StatusUpdateModal.tsx:125, 190

Para cada caso, elimina el useState + useEffect y reemplaza por una constante
calculada durante el render:
```ts
// ❌ Antes
const [processedItems, setProcessedItems] = useState([]);
useEffect(() => { setProcessedItems(items.map(transform)); }, [items]);

// ✅ Después
const processedItems = items.map(transform);
// o con useMemo si es costoso:
const processedItems = useMemo(() => items.map(transform), [items]);
```
```

**Prompt 5.2 — Múltiples setState en un effect → useReducer (9 ocurrencias)**

> `useGanancias.ts:73`, `GroupStatusUpdateModal.tsx:165,201,214`, `useStatusData.ts:16`, `trip-map.tsx:350`, `StatusUpdateModal.tsx:154,187,200`

```
En los siguientes archivos hay useEffects con múltiples llamadas a setState,
lo que provoca múltiples re-renders:

core/hooks/useGanancias.ts:73
components/status-update/GroupStatusUpdateModal.tsx:165, 201, 214
core/hooks/useStatusData.ts:16
app/(tabs)/trip-map.tsx:350
components/status-update/StatusUpdateModal.tsx:154, 187, 200

Consolida el estado relacionado en un useReducer:
```ts
const [state, dispatch] = useReducer(reducer, {
  field1: initialValue1,
  field2: initialValue2,
  ...
});
```
Crea un reducer que maneje las acciones correspondientes y reemplaza los
múltiples setState por un solo dispatch. Trabaja archivo por archivo.
```

**Prompt 5.3 — setState con valor obsoleto → forma funcional (3 ocurrencias)**

```
En los siguientes archivos, setState lee el valor del closure en lugar de usar
la forma funcional, lo que causa bugs cuando hay batching:

components/status-update/GroupStatusUpdateModal.tsx:218
app/verify-email.tsx:48
components/status-update/StatusUpdateModal.tsx:204

Reemplaza:
```ts
setState(stateVar + 1); // ❌ staleValue
setState(prev => prev + 1); // ✅ siempre fresco
```
Muéstrame el código completo de cada llamada y aplica la corrección.
```

---

## Fase 6 — Performance: contextos, memo y refs

**Prompt 6.1 — Context provider con valor inestable (2 ocurrencias)**

```
En `context/AuthContext.tsx:239` y `context/ActiveDeliveryContext.tsx:49`
el valor del provider se construye inline en el JSX, lo que provoca que todos
los consumidores re-rendericen en cada render del provider aunque nada haya cambiado.

Estabiliza el valor con useMemo:
```ts
const value = useMemo(() => ({
  user,
  login,
  logout,
  // ...
}), [user, login, logout]);

return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
```
Aplica esto en ambos contextos.
```

**Prompt 6.2 — Default prop vacío que rompe memo (4 ocurrencias)**

```
En los siguientes componentes, el valor por defecto de un prop es un objeto/array
literal inline, lo que crea un nuevo objeto en cada render y hace que React.memo
nunca sea efectivo:

components/ganancias/RecentDeliveries.tsx:51
components/ganancias/StatsCharts.tsx:34
components/ganancias/PayoutHistory.tsx:51

Mueve la constante vacía al scope del módulo:
```ts
// ✅ Fuera del componente, en el módulo
const EMPTY_ITEMS: Item[] = [];

function MyComponent({ items = EMPTY_ITEMS }) { ... }
```
Aplica para cada uno de los archivos afectados.
```

**Prompt 6.3 — Ref initializer que corre en cada render (15 ocurrencias)**

```
En los siguientes archivos, el valor de un useRef se inicializa con una expresión
costosa que se evalúa en cada render (aunque el resultado se descarte):

components/delivery-items/DeliveryItemList.tsx:24-25, 74
components/ganancias/RecentDeliveries.tsx:22-23, 52-53
components/ganancias/StatsCharts.tsx:11, 35-36
components/ganancias/PayoutHistory.tsx:16-17, 52
components/ganancias/EarningsCard.tsx:17-18

Usa el patrón de inicialización lazy para refs:
```ts
const ref = useRef<T | null>(null);
if (ref.current === null) ref.current = expensiveCall();
```
Aplica en cada caso.
```

**Prompt 6.4 — State initializer que corre en cada render (2 ocurrencias)**

```
En `components/socketstatusindicator.tsx:7` y `app/(tabs)/index.tsx:184`,
el valor inicial de useState es una expresión que se evalúa en cada render.

Envuelve en una arrow function para que solo corra la primera vez:
```ts
// ❌ Antes
const [value, setValue] = useState(expensiveComputation());

// ✅ Después
const [value, setValue] = useState(() => expensiveComputation());
```
```

---

## Fase 7 — Performance: animaciones, listas virtualizadas y paralelismo async

**Prompt 7.1 — Animaciones en JS thread en lugar de Reanimated (5 ocurrencias)**

```
Los siguientes archivos importan `Animated` de `react-native` en lugar de
`react-native-reanimated`, lo que ejecuta las animaciones en el JS thread:

components/delivery-items/DeliveryItemList.tsx:8
components/ganancias/RecentDeliveries.tsx:2
components/ganancias/StatsCharts.tsx:2
components/ganancias/PayoutHistory.tsx:2
components/ganancias/EarningsCard.tsx:2

Reemplaza:
```ts
// ❌
import { Animated } from 'react-native';

// ✅
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
```
Migra las animaciones existentes a la API de Reanimated (useSharedValue +
useAnimatedStyle). Trabaja archivo por archivo.
```

**Prompt 7.2 — ScrollView con listas mapeadas sin virtualización (3 ocurrencias)**

```
En los siguientes componentes se usa `<ScrollView>{items.map(...)}</ScrollView>`,
que renderiza todos los rows a la vez y degrada el scroll:

components/DeliveryModal.tsx:81
components/AssignmentDetailsModal.tsx:107
components/DeliveryProductsList.tsx:41

Reemplaza por FlashList (recomendado), LegendList o FlatList:
```tsx
import { FlashList } from '@shopify/flash-list';

<FlashList
  data={items}
  renderItem={({ item }) => <MyRow item={item} />}
  estimatedItemSize={80}
  keyExtractor={(item) => item.id}
/>
```
Migra cada componente manteniendo el mismo comportamiento visual.
```

**Prompt 7.3 — Awaits independientes en secuencia (1 ocurrencia)**

```
En `services/authService.ts:51` hay dos o más llamadas async independientes
que se ejecutan de forma secuencial con `await` separados.

Paralelízalas con Promise.all:
```ts
// ❌ Antes (secuencial)
const a = await fetchA();
const b = await fetchB();

// ✅ Después (paralelo)
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```
Muéstrame el bloque completo de la función en authService.ts:51 y aplica la corrección.
```

---

## Fase 8 — Bugs específicos de React Native

**Prompt 8.1 — Shadow styles legacy → boxShadow (31 ocurrencias)**

```
Tengo 31 lugares con propiedades de sombra específicas de plataforma
(shadowColor, shadowOffset, shadowOpacity, shadowRadius / elevation) que
no funcionan correctamente en la nueva arquitectura de React Native.

Archivos afectados:
components/NotificationHandler.tsx:126, 131
components/DeliveryModal.tsx:181, 186, 276, 282
app/(tabs)/gestiones.tsx:529, 534, 566, 573, 627, 632
components/delivery-items/DeliveryItemList.tsx:306, 315
components/delivery-items/DeliveryItem.tsx:62, 68
components/ganancias/TopRoute.tsx:53, 57
components/ProgressIconButton.tsx:26, 33
components/ganancias/RecentDeliveries.tsx:97, 101
components/AppHeader.tsx:31, 34
components/ActiveDeliveryCard.tsx:262, 266
components/LocationTrackingIndicator.tsx:97, 103
components/delivery-items/DeliveryGroupItem.tsx:164, 169
components/RouteInfoPanel.tsx:46, 54
app/(tabs)/two.tsx:71, 77, 97, 102, 118, 124
components/ganancias/StatsCharts.tsx:140, 144
components/ganancias/PayoutHistory.tsx:105, 109, 167, 169
components/trip-map-screen/tripMapStyles.ts (múltiples líneas)
app/(tabs)/index.tsx:439, 446
app/login.tsx:348, 354
components/ganancias/EarningsCard.tsx:74, 78

Reemplaza el bloque de sombra legacy por la propiedad unificada:
```ts
// ❌ Antes
shadowColor: '#000',
shadowOffset: { width: 0, height: 2 },
shadowOpacity: 0.1,
shadowRadius: 8,
elevation: 4,

// ✅ Después
boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
```
Trabaja archivo por archivo, comenzando por tripMapStyles.ts (más concentrado).
```

**Prompt 8.2 — Touchable* → Pressable (25 ocurrencias)**

```
En 25 archivos se usan los componentes legacy TouchableOpacity, TouchableHighlight
o TouchableNativeFeedback en lugar de Pressable:

components/DeliveryModal.tsx, app/(tabs)/gestiones.tsx, app/forgot-password.tsx,
components/status-update/GroupStatusUpdateModal.tsx, components/AssignmentDetailsModal.tsx,
components/DeliveryProductsList.tsx, components/ProgressIconButton.tsx,
components/status-update/EvidenceSection.tsx,
components/trip-map-screen/components/CenterLocationButton.tsx,
components/trip-map-screen/components/SimulationControls.tsx,
components/AppHeader.tsx, components/ActiveDeliveryCard.tsx,
components/status-update/StatusList.tsx, components/LocationTrackingIndicator.tsx,
components/ForceUpdateScreen.tsx, app/verify-email.tsx,
components/delivery-items/DeliveryGroupItem.tsx, app/(tabs)/two.tsx,
components/socketstatusindicator.tsx,
components/trip-map-screen/components/MapControls.tsx,
components/status-update/StatusUpdateModal.tsx,
components/status-update/PaymentControls.tsx, app/(tabs)/index.tsx,
app/login.tsx, app/change-initial-password.tsx

Migra cada import y uso a `<Pressable>` de react-native (o react-native-gesture-handler).
Considera que Pressable usa un callback para el estilo al presionar:
```tsx
<Pressable
  style={({ pressed }) => [styles.btn, pressed && styles.btnPressed]}
  onPress={handlePress}
>
  {children}
</Pressable>
```
Trabaja de a 5 archivos por vez para mantener el contexto manejable.
```

**Prompt 8.3 — Dimensions.get → useWindowDimensions (1 ocurrencia)**

```
En `components/delivery-items/DeliveryGroupItem.tsx:161` se usa `Dimensions.get('window')`
para obtener el tamaño de la pantalla. Esto no se actualiza automáticamente en
rotación o cuando cambia el tamaño de la ventana.

Reemplaza por el hook:
```ts
// ❌
const { width, height } = Dimensions.get('window');

// ✅
const { width, height } = useWindowDimensions();
```
```

**Prompt 8.4 — react-native Image → expo-image (5 ocurrencias)**

```
En los siguientes archivos se usa `<Image>` de `react-native` en lugar de
`expo-image`, que ofrece caché, placeholders y crossfades automáticos:

components/AssignmentDetailsModal.tsx:11
components/DeliveryProductsList.tsx:5
components/status-update/EvidenceSection.tsx:2 (también Touchable)
app/_layout.tsx:9
app/login.tsx:7

Reemplaza:
```ts
// ❌
import { Image } from 'react-native';

// ✅
import { Image } from 'expo-image';
```
La API de props es compatible. Agrega `placeholder` y `contentFit` donde aplique.
```

**Prompt 8.5 — Style array de un solo elemento (2 ocurrencias)**

```
En `components/delivery-items/DeliveryGroupItem.tsx` (líneas 134 y 147) hay
`style={[value]}` con un único elemento en el array. Es trabajo extra sin beneficio.

Simplifica a `style={value}` en ambas ocurrencias.
```

---

## Fase 9 — Security y fetch en effects

**Prompt 9.1 — dangerouslySetInnerHTML (1 ocurrencia)**

```
En `app/+html.tsx:22` se usa `dangerouslySetInnerHTML`. A menos que el contenido
sea estrictamente de confianza y no pueda llegar del usuario, reemplázalo por
children de React.

Muéstrame el bloque completo de app/+html.tsx para evaluar si es seguro o si
se puede refactorizar para evitar inyección de HTML.
```

**Prompt 9.2 — Data fetching dentro de un effect (1 ocurrencia)**

```
En `app/login.tsx:43` hay una llamada fetch dentro de un useEffect.

Migra a una solución de data fetching estándar:

Opción A (recomendada si ya usas react-query):
```ts
const { data, isLoading, error } = useQuery({
  queryKey: ['login-data'],
  queryFn: () => fetchLoginData(),
});
```

Opción B (useSWR):
```ts
const { data, error } = useSWR('/api/login-data', fetcher);
```

Muéstrame el useEffect actual en app/login.tsx:43 para proponer la migración.
```

---

## Fase 10 — Mantenibilidad: archivos y exports no usados

**Prompt 10.1 — Archivos no usados / dead code (18 archivos)**

```
Los siguientes archivos están marcados como no alcanzables desde ningún entry point:

components/ActiveDeliveryCard.tsx
components/AppHeader.tsx
components/DeliveryModal.tsx
components/DeliveryProductsList.tsx
components/ExternalLink.tsx
components/LocationTrackingIndicator.tsx
components/ProgressIconButton.tsx
components/delivery-items/DeliveryGroupItem.tsx
components/socketstatusindicator.tsx
components/status-update/StatusUpdateModal.tsx
core/hooks/useDeliveryActions.ts
core/hooks/useOsrmRoute.ts
interfaces/carrier/index.ts
interfaces/location/index.ts
interfaces/response.ts
interfaces/socket/DeliveryAssigned.ts
services/externalServiceHandler.ts
src/api/client.ts

Para cada archivo:
1. Busca si hay algún import en el proyecto (busca por nombre del archivo con grep).
2. Si confirmas que no se importa en ningún lugar → elimínalo.
3. Si debería estar en uso → encuéntra dónde debería importarse y agrégalo.

Empieza por los de `interfaces/` e `src/api/` que suelen ser los más seguros de limpiar.
```

**Prompt 10.2 — Exports no usados (44 ocurrencias)**

```
Hay 44 exports en el proyecto que ningún módulo externo importa. Eliminar el
keyword `export` (o la declaración entera) reduce el surface de la API pública
y facilita tree-shaking.

Archivos con más exports innecesarios:
- services/authService.ts:8-11 (4 exports)
- core/actions/delivery.actions.ts (líneas 34, 41, 48, 57, 88)
- src/api/schemas/ (múltiples archivos de schemas)
- interfaces/auth.ts:84
- interfaces/delivery/deliveryStatus.ts:112, 142
- utils/deepLinkHandler.ts:18, 86, 117

Para cada uno, verifica con una búsqueda en el proyecto que el símbolo
no se use en ningún import antes de quitar el `export`.
Trabaja por carpeta: primero `src/api/schemas/`, luego `interfaces/`, luego `services/`.
```

**Prompt 10.3 — Dependencias circulares (3 ocurrencias)**

```
Hay un ciclo de dependencias entre:
- interfaces/carrier.ts
- interfaces/delivery/delivery.ts
- services/api.ts

Estos tres archivos se importan mutuamente (directa o transitivamente).

Para romper el ciclo:
1. Identifica qué tipos o funciones son los que se importan en ambas direcciones.
2. Extrae esos elementos compartidos a un tercer módulo (ej: `interfaces/shared.ts`).
3. Haz que los tres archivos originales importen desde ese módulo compartido
   en lugar de entre sí.

Muéstrame el árbol de imports entre los tres archivos para diseñar la extracción.
```

**Prompt 10.4 — Dependencias no usadas en package.json**

```
react-doctor detectó una dependencia en package.json que no se usa en ningún
archivo del proyecto.

Muéstrame el package.json completo y busca qué paquete es el no utilizado.
Luego elimínalo con:
```bash
npm uninstall <paquete>
# o
yarn remove <paquete>
```
```

---

## Fase 11 — Mantenibilidad: componentes gigantes y APIs deprecadas

**Prompt 11.1 — Componentes demasiado grandes (4 ocurrencias)**

```
Los siguientes componentes son demasiado grandes para mantenerse bien:

app/(tabs)/gestiones.tsx:48
components/status-update/GroupStatusUpdateModal.tsx:65
app/(tabs)/trip-map.tsx:32
components/status-update/StatusUpdateModal.tsx:46

Para cada uno, aplica el patrón de extracción de sub-componentes:
1. Identifica secciones visuales o lógicas cohesivas (header, lista, footer, form, etc.).
2. Extrae cada sección a su propio componente con nombre descriptivo.
3. Pasa solo los props necesarios a cada sub-componente.

Empieza con `GroupStatusUpdateModal.tsx` que ya tiene otros problemas resueltos en fases anteriores.
```

**Prompt 11.2 — APIs deprecadas de React 19 (4 archivos)**

```
Los siguientes archivos usan `forwardRef` y `useContext`, APIs deprecadas en React 19:

context/AuthContext.tsx:1
context/DeliveryContext.tsx:1
contexts/RouteContext.tsx:1
context/ActiveDeliveryContext.tsx:1

Migra cada uno:
- `forwardRef` → pasa `ref` como prop normal en function components.
- `useContext(X)` → `use(X)` del nuevo API de React 19.

Muéstrame el componente de contexto completo de cada archivo para aplicar la migración.
```

**Prompt 11.3 — Muchos useState relacionados → useReducer (9 componentes)**

```
Los siguientes componentes/hooks tienen muchos useState relacionados que deberían
agruparse en un useReducer:

context/AuthContext.tsx:32
app/(tabs)/gestiones.tsx:48
components/status-update/GroupStatusUpdateModal.tsx:74
context/DeliveryContext.tsx:35
app/verify-email.tsx:20
app/(tabs)/trip-map.tsx:32
components/status-update/StatusUpdateModal.tsx:54
app/login.tsx:29
app/change-initial-password.tsx:22

Para cada uno, agrupa los estados relacionados:
```ts
const [state, dispatch] = useReducer(reducer, {
  isLoading: false,
  error: null,
  data: null,
  // ... todos los estados relacionados
});
```

Muéstrame los useState actuales de cada componente y diseña el reducer correspondiente.
```

---

## Fase 12 — Limpieza final: funciones puras e iteraciones

**Prompt 12.1 — Funciones puras reconstruidas en cada render (11 ocurrencias)**

```
Las siguientes funciones no usan estado local pero están definidas dentro del
componente, por lo que se recrean en cada render:

app/(tabs)/gestiones.tsx:123, 160, 164
components/delivery-items/DeliveryItemList.tsx:85, 241
app/forgot-password.tsx:67, 72
contexts/RouteContext.tsx:46
components/ActiveDeliveryCard.tsx:30
context/ActiveDeliveryContext.tsx:26
components/delivery-items/DeliveryGroupItem.tsx:15

Mueve cada función fuera del componente, al scope del módulo (arriba del componente).
Si la función necesita algún valor del scope del componente, pásalo como parámetro.
```

**Prompt 12.2 — Valores estáticos reconstruidos en cada render (2 ocurrencias)**

```
En `components/status-update/GroupStatusUpdateModal.tsx:104` y
`components/status-update/StatusUpdateModal.tsx:81` hay valores estáticos
(constantes o configuraciones) definidos dentro del componente.

Muévelos al scope del módulo, por encima del componente:
```ts
// ✅ Fuera del componente
const PAYMENT_OPTIONS = [...];

function StatusUpdateModal() { ... }
```
```

**Prompt 12.3 — .map().filter(Boolean) → .flatMap() (3 ocurrencias)**

```
En los siguientes archivos se usa el patrón `.map(...).filter(Boolean)` que
itera el array dos veces:

components/DeliveryModal.tsx:88
app/(tabs)/trip-map.tsx:365, 404

Reemplaza por `.flatMap()` para hacer el trabajo en un solo paso:
```ts
// ❌
items.map(transform).filter(Boolean)

// ✅
items.flatMap(item => {
  const result = transform(item);
  return result ? [result] : [];
})
```
```

**Prompt 12.4 — Iteraciones de array encadenadas (4 ocurrencias)**

```
En los siguientes archivos hay cadenas de `.map().filter()` o similares que
iteran la lista múltiples veces:

app/(tabs)/gestiones.tsx:205
components/AssignmentDetailsModal.tsx:107
components/DeliveryProductsList.tsx:45
core/hooks/useStatusData.ts:49

Consolida en un solo paso con `.reduce()` o un `for...of`:
```ts
// ❌
const result = items.filter(predicate).map(transform);

// ✅
const result = [];
for (const item of items) {
  if (predicate(item)) result.push(transform(item));
}
// o con reduce:
const result = items.reduce((acc, item) => {
  if (predicate(item)) acc.push(transform(item));
  return acc;
}, []);
```
```

**Prompt 12.5 — Non-component export en archivo de componente (1 ocurrencia)**

```
En `app/_layout.tsx:54` hay un export de algo que no es un componente React
(probablemente un tipo, constante o función utilitaria) en un archivo que también
exporta componentes.

Mueve ese export no-componente a su propio archivo utilitario/tipo y actualiza
los imports que lo consumen.
```

---

## Resumen de impacto por fase

| Fase | Tipo | Issues | Impacto |
|------|------|--------|---------|
| 1 | Bugs críticos (✖) | 1 + 41 | 🔴 Alto — memory leaks y renders obsoletos |
| 2 | Bugs de efectos | 24 + 17 + 8 | 🔴 Alto — stale closures y renders fantasma |
| 3 | Lógica de eventos | 19 + 5 | 🔴 Alto — comportamiento incorrecto |
| 4 | Keys y tiempo en JSX | 4 + 5 + 7 | 🟠 Medio — bugs de reconciliación |
| 5 | Estado derivado / cascading | 3 + 6 + 9 + 3 | 🟠 Medio — renders extra |
| 6 | Contextos / memo / refs | 2 + 4 + 15 + 2 | 🟠 Medio — performance |
| 7 | Animaciones / listas / async | 5 + 3 + 1 | 🟠 Medio — performance visual |
| 8 | React Native específicos | 31 + 25 + 1 + 5 + 2 | 🟡 Bajo-medio — compatibilidad RN |
| 9 | Security + fetch | 1 + 1 | 🟠 Medio — seguridad |
| 10 | Dead code / exports | 18 + 44 + 3 + 1 | 🟡 Bajo — mantenibilidad |
| 11 | Componentes grandes / APIs | 4 + 4 + 9 | 🟡 Bajo — mantenibilidad |
| 12 | Limpieza final | 11 + 2 + 3 + 4 + 1 | 🟢 Bajo — clean code |
