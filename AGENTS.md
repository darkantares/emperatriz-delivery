# AGENTS.md

## React Doctor — Known False Positives

These warnings are confirmed false positives. Do NOT re-open or attempt to fix them.

### Missing effect deps ×12
- Reanimated mount animations (`[]` deps intentional) — 9 warnings across PayoutHistory, EarningsCard, RecentDeliveries, StatsCharts, DeliveryItemList
- Ref-based "latest callback" pattern (callbacks read via `.current` refs) — 2 warnings in useGpsTracking.ts
- `useState` setters in deps (React guarantees stable identity) — 1 warning in ActiveDeliveryContext.tsx

### Time/random in JSX ×2
- `new Date()` inside `onConfirm` callback, not in render — GroupStatusUpdateModal.tsx:478-481

### dangerouslySetInnerHTML ×1
- HTML shell for Expo web (+html.tsx:22) — not user content

### Deprecated React 19 APIs ×4
- `useContext` is NOT deprecated in React 19 — FALSE POSITIVE

### Event logic in effect ×1
- useTripRouteSync.ts:25 — external WebView sync, not local state

### Unused export ×1
- useClientOnlyValue.ts — used in app/(tabs)/_layout.tsx:33

### JSX element as prop ×2
- `RefreshControl` in ScrollView — standard React Native pattern

### Component too large ×2
- GroupStatusUpdateModal.tsx (965 lines) and trip-map.tsx (332 lines) — architectural, deferred to future refactoring

### Many related useState ×8
- Most are independent state slices (login.tsx, trip-map.tsx, gestiones.tsx)
- GroupStatusUpdateModal.tsx:82 is a true positive but deferred due to 965-line file size

### Data fetching in effect ×1
- login.tsx:43 — has AbortController cleanup, would require @tanstack/react-query migration to fully resolve

### Cyclic dependency ×1
- services/api.ts — needs investigation, deferred

### Unused dependency in package.json
- `react-native-worklets` is a peer dependency of `react-native-reanimated`, not unused
