import { useState, useRef, useCallback, useEffect, RefObject } from "react";
import { Coordinate } from "../types";
import {
  DEVIATION_THRESHOLD_METERS,
  DEVIATION_DEBOUNCE_MS,
} from "../constants";

export interface UseRouteDeviationResult {
  isDeviating: boolean;
  detectRouteDeviation: (
    actualPosition: Coordinate,
    minDistance: number,
  ) => void;
  recalculateRouteOnDeviation: (currentPosition: Coordinate) => void;
}

export function useRouteDeviation(
  recalculateRef: RefObject<() => Promise<void>>,
): UseRouteDeviationResult {
  const [isDeviating, setIsDeviating] = useState<boolean>(false);
  const [deviationDetectedTime, setDeviationDetectedTime] = useState<number>(0);

  const deviationThresholdRef = useRef<number>(DEVIATION_THRESHOLD_METERS);
  const deviationDebounceRef = useRef<number>(DEVIATION_DEBOUNCE_MS);
  const recalculationPendingRef = useRef<boolean>(false);
  const isDeviatingRef = useRef<boolean>(false);
  const deviationDetectedTimeRef = useRef<number>(0);

  useEffect(() => {
    isDeviatingRef.current = isDeviating;
  }, [isDeviating]);

  useEffect(() => {
    deviationDetectedTimeRef.current = deviationDetectedTime;
  }, [deviationDetectedTime]);

  const detectRouteDeviation = useCallback(
    (actualPosition: Coordinate, minDistance: number): void => {
      if (!actualPosition) {
        console.log(
          "[useRouteDeviation][DEBUG] detectRouteDeviation: actualPosition null",
        );
        return;
      }
      const now = Date.now();
      const hasDeviationThresholdExceeded =
        minDistance > deviationThresholdRef.current;
      const isDeviation =
        hasDeviationThresholdExceeded && !isDeviatingRef.current;
      const isRecovering =
        !hasDeviationThresholdExceeded && isDeviatingRef.current;

      if (isDeviation) {
        console.log(
          `[useRouteDeviation] DESVIACION DETECTADA - Distancia a ruta: ${minDistance.toFixed(0)}m (umbral: ${deviationThresholdRef.current}m)`,
        );
        setIsDeviating(true);
        setDeviationDetectedTime(now);
      } else if (isRecovering) {
        console.log(
          `[useRouteDeviation] DESVIACION RESUELTA - De vuelta en la ruta (distancia: ${minDistance.toFixed(0)}m)`,
        );
        setIsDeviating(false);
        recalculationPendingRef.current = false;
      }
    },
    [],
  );

  const recalculateRouteOnDeviation = useCallback(
    (_currentPosition: Coordinate): void => {
      if (!_currentPosition) {
        console.log(
          "[useRouteDeviation][DEBUG] recalculateRouteOnDeviation: currentPosition null",
        );
        return;
      }
      const now = Date.now();
      const timeSinceDeviation =
        now - deviationDetectedTimeRef.current;
      const shouldRecalculate =
        isDeviatingRef.current &&
        timeSinceDeviation > deviationDebounceRef.current &&
        !recalculationPendingRef.current;

      if (shouldRecalculate) {
        console.log(
          `[useRouteDeviation] RECALCULANDO RUTA - Desviacion persistente por ${(timeSinceDeviation / 1000).toFixed(0)}s`,
        );
        recalculationPendingRef.current = true;
        recalculateRef.current();
      }
    },
    [recalculateRef],
  );

  return {
    isDeviating,
    detectRouteDeviation,
    recalculateRouteOnDeviation,
  };
}
