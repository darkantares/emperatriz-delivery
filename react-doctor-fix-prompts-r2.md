# React Doctor — Prompts de corrección por fases (Ronda 2)

> Proyecto: **emperatriz-delivery** · Score actual: **70/100** · Issues: 50 (0 errors, 50 warnings)
> Orden: de mayor impacto a menor. Resuelve una fase antes de pasar a la siguiente.
> **IMPORTANTE:** Lee cada archivo ANTES de editar. Confirma que el diagnóstico es un verdadero positivo antes de corregir.

---

## Fase 1 — Performance: Ref initializer + unused dependency (2 fixes, bajo riesgo)

> **Por qué primero:** Son fixes simples, seguros y que reducen warnings de Performance. El ref initializer es un leak menor y el unused dependency es limpieza de package.json.

**Prompt 1.1 — Ref initializer runs on every render (`components/delivery-items/DeliveryItemList.tsx:76`)**

```
En `components/delivery-items/DeliveryItemList.tsx:76`, hay un useRef cuyo
initializer se ejecuta en cada render:

  const rowSwipeables = useRef(new Map<string, Swipeable | null>());

Cada render crea un `new Map()` nuevo (se evalúa el argumento), aunque useRef
solo usa el primer valor. Es un object allocation desperdiciada en cada render.

Corrección canónica — lazy init:
  const rowSwipeablesRef = useRef<Map<string, Swipeable | null> | null>(null);
  if (rowSwipeablesRef.current === null) {
    rowSwipeablesRef.current = new Map();
  }

Nota: TypeScript puede quejarse de `.current` nullable. Si es así, usa
non-null assertion (!) en los puntos de uso, o redefine el tipo con
un wrapper.

Verifica que TypeScript pasa después del cambio: `npx tsc --noEmit`
```

**Prompt 1.2 — Unused dependency in package.json**

```
React Doctor detecta una dependencia sin usar en `package.json`.

1. Ejecuta: `npx depcheck --json` (o revisa manualmente los imports)
2. Identifica qué paquete no se importa en ningún archivo .ts/.tsx del proyecto
3. Si es una dependencia de desarrollo (devDependency) que solo se usa en
   config files (eslint, babel, etc.), es probablemente un falso positivo
   — confirma que se usa en esos archivos.
4. Si es una dependency real sin uso, elimínala:
   `yarn remove <nombre-paquete>`

Verifica que el build sigue funcionando después.
```

---

## Fase 2 — Bugs: Multiple setState calls in one effect (3 fixes, impacto real)

> **Por qué:** Cada `setX()` en un effect dispara un render. Tres calls = 3 renders extra. Un useReducer consolida en 1 render.

**Prompt 2.1 — Multiple setState in useEffect (`app/(tabs)/trip-map.tsx:53`)**

```
En `app/(tabs)/trip-map.tsx:53`, un useEffect hace 3 llamadas a setState:

  useEffect(() => {
    if (tripData !== tripDataRef.current) {
      setCurrentTargetGroupIndex(0);
      setCompletedDeliveryIds(new Set());
      setDeliveryStatusOverrides(new Map());
      tripDataRef.current = tripData;
    }
  }, [tripData]);

Estos 3 estados representan la "progresión de waypoints" — se resetean
juntos cuando cambia tripData. Son candidatos ideales para useReducer.

Corrección:
1. Crea un tipo `ProgressionState` con { currentTargetGroupIndex, completedDeliveryIds, deliveryStatusOverrides }
2. Crea un reducer `progressionReducer` con action `RESET` que retorna el estado inicial
3. Reemplaza los 3 useState por: const [progression, dispatch] = useReducer(progressionReducer, initialState)
4. En el effect: dispatch({ type: 'RESET' })
5. Donde se usan los estados individuales, accede a progression.currentTargetGroupIndex, etc.
6. Donde se hacían setters individuales, usa dispatch con actions específicas

Lee el archivo completo primero para entender todos los puntos de uso.
Verifica: `npx tsc --noEmit`
```

**Prompt 2.2 — Multiple setState in useEffect (`core/hooks/useGanancias.ts:70`)**

```
En `core/hooks/useGanancias.ts:70`, un useEffect limpia 8 estados cuando
el usuario se desautentica:

  useEffect(() => {
    if (isAuthenticated && !wasAuthenticatedRef.current) {
      fetchData();
    } else if (!isAuthenticated) {
      setIsLoading(false);
      setError(null);
      setEarnings(null);
      setPaidInvoices([]);
      setMonthlyStats([]);
      setWeeklyStats([]);
      setDeliveryStats(null);
      setTopRoute(null);
      setRecentDeliveries([]);
    }
    wasAuthenticatedRef.current = isAuthenticated;
  }, [isAuthenticated, fetchData]);

Los 8+ setters en el branch `!isAuthenticated` deberían ser un reducer.

Corrección:
1. Define tipo `GananciasState` con todos los campos
2. Crea reducer con actions: FETCH_START, FETCH_SUCCESS, FETCH_ERROR, CLEAR
3. Reemplaza los 9+ useState por useReducer
4. El branch `!isAuthenticated` se convierte en: dispatch({ type: 'CLEAR' })

Nota: fetchData también hace setState — refactorízalo para que haga
dispatch({ type: 'FETCH_START' }) antes del fetch, dispatch({ type: 'FETCH_SUCCESS', payload }) al recibir datos, etc.

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

**Prompt 2.3 — Multiple setState in useEffect (`components/status-update/useVerificationCode.ts:44`)**

```
En `components/status-update/useVerificationCode.ts:44`, un useEffect
maneja un timer de lockout con múltiples setState:

  useEffect(() => {
    let timer;
    if (isCodeLocked && lockTimeRemaining > 0) {
      timer = setTimeout(() => {
        setLockTimeRemaining((prev) => prev - 1);
      }, 1000);
    } else if (isCodeLocked && lockTimeRemaining === 0) {
      setIsCodeLocked(false);
      setFailedAttempts(0);
      setVerificationCode("");
      setCodeVerificationStatus("pending");
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isCodeLocked, lockTimeRemaining]);

El branch `lockTimeRemaining === 0` hace 4 setters que resetean el
estado de verificación.

Corrección:
1. Agrupa { isCodeLocked, lockTimeRemaining, failedAttempts, verificationCode, codeVerificationStatus } en un reducer
2. Actions: TICK, UNLOCK, SET_CODE, SET_STATUS, etc.
3. El effect se simplifica: dispatch({ type: 'TICK' }) en el timer,
   dispatch({ type: 'UNLOCK' }) cuando se desbloquea

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

---

## Fase 3 — Bugs: Derived value copied into state (1 fix)

> **Por qué:** Calcular un valor derived y guardarlo en useState + useEffect es un patrón anti-react. Crea renders extra y código más complejo de lo necesario.

**Prompt 3.1 — Derived value copied into state (`core/hooks/useGanancias.ts:72`)**

```
En `core/hooks/useGanancias.ts`, hay un patrón donde un valor calculado
se guarda en useState via useEffect en vez de calcularse durante el render.

Lee el archivo completo y busca:
1. Un useState que solo se escribe desde un useEffect
2. El useEffect calcula algo a partir de otros valores y hace setX(resultado)
3. Ese valor se puede calcular con useMemo o directamente en el render

Corrección:
- Reemplaza el useState + useEffect por useMemo o una variable calculada
- Ejemplo: en vez de:
    const [total, setTotal] = useState(0);
    useEffect(() => { setTotal(items.reduce(...)); }, [items]);
  Usa:
    const total = useMemo(() => items.reduce(...), [items]);

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

---

## Fase 4 — Bugs: State initialized from mount effect (6 fixes, alto volumen)

> **Por qué:** Son 6 instancias del mismo patrón: fetch async en useEffect → setState con resultado. En React Native (sin SSR), el riesgo es menor, pero sigue siendo un patrón subóptimo.

**Prompt 4.1 — State from mount effect (`core/hooks/usePaymentMethods.ts:18`)**

```
En `core/hooks/usePaymentMethods.ts:18`, un useEffect carga datos
y los guarda en useState:

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const data = await getPaymentMethods();
        setPaymentMethods(data);
      } catch { ... }
    };
    loadPaymentMethods();
  }, []);

Esto es un "state initialized from mount effect". El patrón correcto
en React 18+ es:
1. Inicializar con un valor por defecto (array vacío o null)
2. Si los datos son estáticos/caché: mover la llamada antes del componente
3. Si son datos dinámicos: usar react-query o similar
4. Si es simple: usar un state initializer function

Corrección más simple para este caso:
- Mover la lógica de carga fuera del effect
- O mantener el effect pero con cleanup/abort si es posible

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

**Prompt 4.2 — State from mount effect (`core/hooks/useOTAUpdates.ts:68`)**

```
En `core/hooks/useOTAUpdates.ts:68`:

  useEffect(() => {
    runUpdateCheck();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

Un update check al montar es legítimo — pero el efecto no tiene cleanup
ni AbortController. Si el componente se desmonta antes de que termine
runUpdateCheck, puede intentar hacer setState en componente desmontado.

Corrección:
1. Agrega AbortController o flag `isMounted` para evitar setState post-unmount
2. Ejemplo:
    useEffect(() => {
      const controller = new AbortController();
      runUpdateCheck(controller.signal);
      return () => controller.abort();
    }, []);

Nota: runUpdateCheck necesita acceptar un AbortSignal.
```

**Prompt 4.3 — State from mount effect (`context/AuthContext.tsx:88`)**

```
En `context/AuthContext.tsx:88`, un useEffect llama checkAuth() al montar:

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authData = await authService.getAuthData();
        setIsAuthenticated(!!authData.token);
        setUser(authData.user || null);
        setCarrier(authData.carrier || null);
        setRoles(authData.roles || null);
      } catch (error) {
        setIsAuthenticated(false);
        setUser(null);
        setCarrier(null);
        setRoles(null);
      } finally {
        setIsLoading(false);
      }
    };
    checkAuth();
  }, []);

Este effect hace 4-5 setState calls + la inicialización async.
Corrección:
1. Verificar auth al montar es legítimo — el effect es correcto
2. Pero los múltiples setters en el catch pueden consolidarse:
   Si el AuthContext ya tiene un reducer, úsalo
3. Si no tiene reducer, convierte a un objeto de estado único:
    type AuthState = { isAuthenticated, user, carrier, roles, isLoading }
    Y usa un reducer con actions: AUTH_SUCCESS, AUTH_FAILURE, AUTH_LOADING

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

**Prompt 4.4 — State from mount effect (`core/hooks/useStatusData.ts:38`)**

```
En `core/hooks/useStatusData.ts:38`:

  useEffect(() => {
    const loadStatuses = async () => {
      try {
        if (networkState.isConnected) {
          const data = await getStatuses();
          setAllStatuses(data);
        } else {
          setAllStatuses(getCachedStatuses());
        }
      } catch { ... }
      setLoadingStatuses(false);
    };
    loadStatuses();
  }, []);

Patrón similar: async init → setState. El hook ya tiene un useMemo
para derivar availableStatuses (bien).

Corrección:
1. Mantener el effect para async init es OK
2. Agregar cleanup/abort si getStatuses soporta AbortSignal
3. Si no soporta, agregar flag `cancelled`:
    useEffect(() => {
      let cancelled = false;
      const loadStatuses = async () => {
        const data = await getStatuses();
        if (!cancelled) setAllStatuses(data);
      };
      loadStatuses();
      return () => { cancelled = true; };
    }, []);

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

**Prompt 4.5 — State from mount effect (`app/verify-email.tsx:42`)**

```
En `app/verify-email.tsx:42`:

  useEffect(() => {
    const getEmail = async () => {
      try {
        const authData = await authService.getAuthData();
        if (authData.user?.email) {
          setEmail(authData.user.email);
        }
      } catch (error) { ... }
    };
    getEmail();
  }, []);

Carga async del email del usuario. Corrección:
1. Agregar cleanup pattern:
    useEffect(() => {
      let cancelled = false;
      const getEmail = async () => {
        const authData = await authService.getAuthData();
        if (!cancelled && authData.user?.email) {
          setEmail(authData.user.email);
        }
      };
      getEmail();
      return () => { cancelled = true; };
    }, []);

Lee el archivo completo. Verifica: `npx tsc --noEmit`
```

**Prompt 4.6 — State from mount effect (`app/login.tsx:57`)**

```
En `app/login.tsx:57`, el useEffect ya tiene AbortController (fix anterior).
El warning persiste porque react-doctor detecta fetch() dentro de useEffect
incluso con AbortController.

El fix canónico sería migrar a @tanstack/react-query:
  yarn add @tanstack/react-query

1. Crear un QueryClientProvider en app/_layout.tsx
2. Reemplazar el fetch por useQuery:
    const { data: appVersion } = useQuery({
      queryKey: ['appVersion'],
      queryFn: () => fetch(`${API_URL}/app-version/delivery`).then(r => r.json()),
      staleTime: Infinity,
    });

Nota: Esto requiere un cambio arquitectónico mayor. Evalúa si el ROI
justifica el esfuerzo. Si no, este warning se puede ignorar.
```

---

## Fase 5 — Bugs: State only used in handlers (2 fixes)

> **Por qué:** Si un estado solo se lee/escribe en handlers (nunca en JSX), un `useRef` es más eficiente — no causa re-renders innecesarios.

**Prompt 5.1 — State only in handlers (`components/status-update/GroupStatusUpdateModal.tsx:92`)**

```
En `components/status-update/GroupStatusUpdateModal.tsx:92`:

  const [amountPaidEdited, setAmountPaidEdited] = useState<boolean>(false);

React Doctor dice que `amountPaidEdited` solo se usa en handlers (setters).
Verifica: ¿se usa en JSX (return)? ¿O solo en handleSelectStatus, handleConfirm, etc.?

Si SOLO se usa en handlers:
1. Cambia a useRef: const amountPaidEditedRef = useRef(false);
2. Cambia setAmountPaidEdited(x) por amountPaidEditedRef.current = x
3. Cambia amountPaidEdited por amountPaidEditedRef.current

Si se usa en JSX (cálculos derivados, condicionales, etc.):
- Es un falso positivo. No hagas nada.

Lee el archivo completo ANTES de decidir.
```

**Prompt 5.2 — State only in handlers (`app/(tabs)/trip-map.tsx:48`)**

```
En `app/(tabs)/trip-map.tsx:48`:

  const [completedDeliveryIds, setCompletedDeliveryIds] = useState<Set<string>>(new Set());

React Doctor dice que `completedDeliveryIds` solo se usa en handlers.
Verifica en el archivo: ¿se usa en JSX o en cálculos derivados?

Si SOLO se usa en handlers:
1. Cambia a useRef: const completedDeliveryIdsRef = useRef(new Set<string>());
2. Actualiza los setters y lecturas

Si se usa en JSX o derivaciones:
- Es un falso positivo.

Lee el archivo completo ANTES de decidir.
```

---

## Fase 6 — Maintainability: GroupStatusUpdateModal → useReducer (1 fix grande)

> **Por qué:** Este componente tiene 11 estados de formulario que se resetean juntos, se coordinan entre sí, y se benefician de un reducer centralizado. Reduce 11× setState en un solo dispatch.

**Prompt 6.1 — GroupStatusUpdateModal useReducer (`components/status-update/GroupStatusUpdateModal.tsx`)**

```
En `components/status-update/GroupStatusUpdateModal.tsx`, hay 11 useState
que representan un formulario de actualización de estado de entrega:

  selectedStatus, loading, note, amountPaid, amountPaidEdited,
  additionalAmount, selectedPaymentMethod, scheduledAt,
  showSchedulePicker, showPaymentMethodPicker
  + photo state from usePhotoCapture

Estos estados se resetean juntos en handleConfirm (líneas 320-330)
y se coordinan en handleSelectStatus.

Corrección a useReducer:

1. Define el tipo de estado:
type FormState = {
  selectedStatus: string | null;
  loading: boolean;
  note: string;
  amountPaid: string;
  amountPaidEdited: boolean;
  additionalAmount: string;
  selectedPaymentMethod: number | null;
  scheduledAt: Date | null;
  showSchedulePicker: boolean;
  showPaymentMethodPicker: boolean;
};

2. Define las actions:
type FormAction =
  | { type: 'SELECT_STATUS'; status: string | null }
  | { type: 'SET_NOTE'; note: string }
  | { type: 'SET_AMOUNT_PAID'; amount: string }
  | { type: 'SET_AMOUNT_PAID_EDITED'; edited: boolean }
  | { type: 'SET_ADDITIONAL_AMOUNT'; amount: string }
  | { type: 'SET_PAYMENT_METHOD'; id: number | null }
  | { type: 'SET_SCHEDULED_AT'; date: Date | null }
  | { type: 'TOGGLE_SCHEDULE_PICKER' }
  | { type: 'TOGGLE_PAYMENT_METHOD_PICKER' }
  | { type: 'SET_LOADING'; loading: boolean }
  | { type: 'RESET' };

3. Crea el reducer con switch/case
4. Reemplaza los 11 useState por:
   const [form, dispatch] = useReducer(formReducer, initialState);
5. handleConfirm: dispatch({ type: 'RESET' }) en vez de 11 setters
6. handleSelectStatus: dispatch({ type: 'SELECT_STATUS', status })
   + lógica de auto-fill de amountPaid dentro del reducer
7. Los handlers individuales usan dispatch en vez de setters

Lee el archivo COMPLETO antes de empezar. Hay 965 líneas.
Verifica: `npx tsc --noEmit`
```

---

## Fase 7 — Maintainability: Component splitting (2 fixes)

> **Por qué:** Componentes muy grandes son difíciles de mantener. Extraer secciones en sub-componentes reduce la complejidad y mejora la reusabilidad.

**Prompt 7.1 — Split GroupStatusUpdateModal (`components/status-update/GroupStatusUpdateModal.tsx:73`)**

```
`GroupStatusUpdateModal.tsx` tiene 965 líneas. Debe dividirse en
componentes más pequeños.

Estrategia de splitting:
1. **ModalFooter** — extraer el botón de confirmar/cancelar al fondo
2. **StatusFormSection** — extraer la sección de formulario (note, payment, schedule)
3. **GpsSection** — extraer la sección de GPS/ubicación
4. Cada sub-componente recibe sus props y handlers

Nota: Primero aplica el useReducer de Fase 6, luego el splitting.
El reducer simplifica los props que pasan entre componentes.

Lee el archivo completo. Identifica las secciones lógicas.
```

**Prompt 7.2 — Split trip-map (`app/(tabs)/trip-map.tsx:31`)**

```
`trip-map.tsx` tiene 334 líneas. Debe dividirse en componentes más pequeños.

Estrategia de splitting:
1. Ya tiene hooks extraídos (useTripDerivedData, useTripModals, etc.)
2. Extraer la sección de lista de waypoints en un componente
3. Extraer la sección de información del viaje en otro componente
4. El componente principal solo orquesta hooks y pasa props

Lee el archivo completo. Identifica las secciones de JSX que pueden
ser componentes independientes.
```

---

## Fase 8 — Cleanup final

> **Por qué:** Algunos warnings son falsos positivos o requieren decisiones arquitectónicas. Documentarlos evita que otros desarrolladores los reabran.

**Prompt 8.1 — Documentar falsos positivos en AGENTS.md**

```
Crea o actualiza un archivo AGENTS.md en la raíz del proyecto con
una sección "React Doctor — Known False Positives":

## False Positives confirmados (no requieren fix)

### Missing effect deps ×12
- Reanimated mount animations ([] deps intencional) — 9 warnings
- Ref-based latest callback pattern — 2 warnings (useGpsTracking)
- useState setters in deps (React guarantee) — 1 warning

### Time/random in JSX ×2
- new Date() dentro de onConfirm callback, no en render — FALSE POSITIVE

### dangerouslySetInnerHTML ×1
- HTML shell para Expo web (+html.tsx) — no es contenido de usuario

### Deprecated React 19 APIs ×4
- useContext NO está deprecado en React 19 — FALSE POSITIVE

### Event logic in effect ×1
- useTripRouteSync: sync con WebView externo — FALSE POSITIVE

### Unused export ×1
- useClientOnlyValue.ts se usa en app/(tabs)/_layout.tsx — FALSE POSITIVE

### JSX element as prop ×2
- RefreshControl en ScrollView — patrón estándar de React Native

### Component too large ×2
- Requiere arquitectura de splitting — fix futuro

### State only used in handlers ×2
- Verificar caso por caso — algunos son falsos positivos
```

**Prompt 8.2 — Investigar cyclic dependency (`services/api.ts`)**

```
React Doctor detecta una dependencia cíclica en `services/api.ts`.

1. Ejecuta: `npx madge --circular services/api.ts`
2. Identifica el ciclo exacto (qué archivos se importan mutuamente)
3. La corrección típica es extraer la parte compartida a un tercer módulo
4. Si el ciclo es entre api.ts y un service que api.ts importa,
   la solución es inyectar la dependencia en vez de importarla

Lee el archivo y los involucrados en el ciclo antes de decidir.
```

---

## Estimación de impacto

| Fase | Fixes | Impacto estimado en score | Riesgo |
|------|-------|--------------------------|--------|
| 1 | 2 | +0 a +1 | Bajo |
| 2 | 3 | +1 a +2 | Medio |
| 3 | 1 | +0 a +1 | Bajo |
| 4 | 6 | +1 a +2 | Bajo |
| 5 | 2 | +0 a +1 | Bajo |
| 6 | 1 | +1 a +2 | Alto |
| 7 | 2 | +0 a +1 | Medio |
| 8 | 2 | +0 (documentación) | Bajo |
| **Total** | **19** | **+3 a +12** | |

**Score estimado post-fases: 73-82/100**

Los falsos positivos (28 warnings) no se pueden reducir sin configurar
el linter para ignorarlos. Para llegar a 90+ se necesitaría:
1. Configurar overrides en react-doctor.config.json
2. Migrar a @tanstack/react-query para eliminar no-fetch-in-effect
3. Reducir componentes a <300 líneas cada uno
