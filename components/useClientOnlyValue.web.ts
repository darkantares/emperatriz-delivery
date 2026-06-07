import React from 'react';

// In web context, always use the client value directly (no SSR hydration in RN web)
export function useClientOnlyValue<S, C>(_server: S, client: C): C {
  return client;
}
