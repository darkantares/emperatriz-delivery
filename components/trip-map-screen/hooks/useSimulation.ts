import { useEffect, useRef, useState } from "react";
import { Coordinate } from "../types";
import { simulateDeviation } from "../utils/geoUtils";

export interface UseSimulationParams {
  sendToMap: (data: object) => void;
  routeCoordinates: Coordinate[];
  totalDistance: number;
  totalDuration: number;
  onPositionUpdate: (pos: Coordinate) => void;
  onIndexUpdate: (idx: number) => void;
  onRemainingUpdate: (remDist: number, remDur: number) => void;
}

export interface UseSimulationResult {
  isManualSimulation: boolean;
  setIsManualSimulation: (value: boolean) => void;
}

export function useSimulation(
  params: UseSimulationParams,
): UseSimulationResult {
  const {
    sendToMap,
    routeCoordinates,
    totalDistance,
    totalDuration,
    onPositionUpdate,
    onIndexUpdate,
    onRemainingUpdate,
  } = params;

  const [isManualSimulation, setIsManualSimulation] = useState<boolean>(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sendToMapRef = useRef(sendToMap);
  const onPositionUpdateRef = useRef(onPositionUpdate);
  const onIndexUpdateRef = useRef(onIndexUpdate);
  const onRemainingUpdateRef = useRef(onRemainingUpdate);

  useEffect(() => { sendToMapRef.current = sendToMap; }, [sendToMap]);
  useEffect(() => { onPositionUpdateRef.current = onPositionUpdate; }, [onPositionUpdate]);
  useEffect(() => { onIndexUpdateRef.current = onIndexUpdate; }, [onIndexUpdate]);
  useEffect(() => { onRemainingUpdateRef.current = onRemainingUpdate; }, [onRemainingUpdate]);

  useEffect(() => {
    if (!(__DEV__ && isManualSimulation) || routeCoordinates.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    console.log("[useSimulation] Iniciando simulación manual");

    let currentStep = 0;
    const { length } = routeCoordinates;

    intervalRef.current = setInterval(() => {
      const nextStep = currentStep + 1;

      if (nextStep >= length) {
        console.log("[useSimulation] Destino alcanzado (simulación)");
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        setIsManualSimulation(false);
        return;
      }

      const expectedPosition = routeCoordinates[nextStep];
      if (!expectedPosition) {
        console.log(
          "[useSimulation][DEBUG] simulación: expectedPosition null en index",
          nextStep,
        );
        return;
      }

      const actualPosition = simulateDeviation(expectedPosition);
      onPositionUpdateRef.current(actualPosition);

      sendToMapRef.current({
        type: "SET_VIEW",
        latitude: actualPosition.latitude,
        longitude: actualPosition.longitude,
        zoom: 15,
      });

      const progressPercentage = nextStep / length;
      const remDist = totalDistance * (1 - progressPercentage);
      const remDur = totalDuration * (1 - progressPercentage);
      onRemainingUpdateRef.current(remDist, remDur);
      onIndexUpdateRef.current(nextStep);

      currentStep = nextStep;
    }, 2000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isManualSimulation, routeCoordinates, totalDistance, totalDuration]);

  return {
    isManualSimulation,
    setIsManualSimulation,
  };
}
