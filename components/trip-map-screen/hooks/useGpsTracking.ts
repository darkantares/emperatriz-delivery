import { useEffect, useRef } from "react";
import * as Location from "expo-location";
import { Coordinate, WaypointGroup } from "../types";
import { calculateDistance } from "../utils/geoUtils";
import { DESTINATION_REACHED_RADIUS_METERS } from "../constants";

export interface UseGpsTrackingParams {
  sendToMap: (data: object) => void;
  routeCoordinates: Coordinate[];
  totalDistance: number;
  totalDuration: number;
  groupedWaypoints: WaypointGroup[];
  isTraveling: boolean;
  recalculateRef: React.RefObject<() => Promise<void>>;
  routeCoordinatesRef: React.RefObject<Coordinate[]>;
  totalDistanceRef: React.RefObject<number>;
  totalDurationRef: React.RefObject<number>;
  onPositionUpdate: (pos: Coordinate) => void;
  onIndexUpdate: (idx: number) => void;
  onRemainingUpdate: (remDist: number, remDur: number) => void;
  onDestinationReached: () => void;
  detectRouteDeviation: (pos: Coordinate, minDist: number) => void;
  recalculateRouteOnDeviation: (pos: Coordinate) => void;
}

export function useGpsTracking(params: UseGpsTrackingParams): void {
  const {
    sendToMap,
    routeCoordinates,
    totalDistance,
    totalDuration,
    groupedWaypoints,
    isTraveling,
    routeCoordinatesRef,
    totalDistanceRef,
    totalDurationRef,
    onPositionUpdate,
    onIndexUpdate,
    onRemainingUpdate,
    onDestinationReached,
    detectRouteDeviation,
    recalculateRouteOnDeviation,
  } = params;

  const locationSubscriptionRef = useRef<Location.LocationSubscription | null>(
    null,
  );
  const isTravelingRef = useRef<boolean>(false);

  useEffect(() => {
    isTravelingRef.current = isTraveling;
  }, [isTraveling]);

  // Effect A: Travel tracking (production branch)
  useEffect(() => {
    if (__DEV__) return;
    if (!isTraveling || routeCoordinates.length === 0) {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
      return;
    }

    console.log("[useGpsTracking] Iniciando seguimiento GPS (viaje)");

    (async () => {
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (location) => {
            if (!location || !location.coords) {
              console.log(
                "[useGpsTracking][DEBUG] GPS viaje: location/coords null",
              );
              return;
            }
            const actualPosition: Coordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };
            onPositionUpdate(actualPosition);
            sendToMap({
              type: "SET_VIEW",
              latitude: actualPosition.latitude,
              longitude: actualPosition.longitude,
              zoom: 15,
            });

            let closestIndex = 0;
            let minDistance = Infinity;
            routeCoordinates.forEach((coord, index) => {
              const distance = calculateDistance(actualPosition, coord);
              if (distance < minDistance) {
                minDistance = distance;
                closestIndex = index;
              }
            });
            onIndexUpdate(closestIndex);
            const progressPercentage =
              closestIndex / routeCoordinates.length;
            const remDist = totalDistance * (1 - progressPercentage);
            const remDur = totalDuration * (1 - progressPercentage);
            onRemainingUpdate(remDist, remDur);

            if (routeCoordinates.length > 0) {
              const lastPoint =
                routeCoordinates[routeCoordinates.length - 1];
              if (
                calculateDistance(actualPosition, lastPoint) <
                DESTINATION_REACHED_RADIUS_METERS
              ) {
                console.log(
                  "[useGpsTracking] Destino alcanzado (GPS viaje)",
                );
                onDestinationReached();
              }
            }
          },
        );
        locationSubscriptionRef.current = subscription;
      } catch (err: any) {
        console.error(
          "[useGpsTracking] Error iniciando seguimiento GPS (viaje):",
          err,
        );
        onDestinationReached();
      }
    })();

    return () => {
      if (locationSubscriptionRef.current) {
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTraveling, routeCoordinates, totalDistance, totalDuration]);

  // Effect B: Continuous GPS tracking
  useEffect(() => {
    if (groupedWaypoints.length === 0 || __DEV__) return;

    console.log(
      "[useGpsTracking] Iniciando tracking GPS continuo (ruta lista)",
    );

    (async () => {
      try {
        const subscription = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.BestForNavigation,
            timeInterval: 1000,
            distanceInterval: 0,
          },
          (location) => {
            if (!location || !location.coords) {
              console.log(
                "[useGpsTracking][DEBUG] GPS callback: location o coords null",
                location,
              );
              return;
            }
            if (
              location.coords.latitude == null ||
              location.coords.longitude == null
            ) {
              console.log(
                "[useGpsTracking][DEBUG] GPS callback: lat/lng null",
                JSON.stringify(location.coords),
              );
              return;
            }
            const actualPosition: Coordinate = {
              latitude: location.coords.latitude,
              longitude: location.coords.longitude,
            };

            onPositionUpdate(actualPosition);

            sendToMap({
              type: "UPDATE_POSITION",
              latitude: actualPosition.latitude,
              longitude: actualPosition.longitude,
            });

            if (
              isTravelingRef.current &&
              routeCoordinatesRef.current.length > 0
            ) {
              let closestIndex = 0;
              let minDistance = Infinity;
              routeCoordinatesRef.current.forEach(
                (coord: Coordinate, index: number) => {
                  if (
                    !coord ||
                    coord.latitude == null ||
                    coord.longitude == null
                  ) {
                    console.log(
                      "[useGpsTracking][DEBUG] GPS: coord null en ruta index",
                      index,
                      JSON.stringify(coord),
                    );
                    return;
                  }
                  const distance = calculateDistance(actualPosition, coord);
                  if (distance < minDistance) {
                    minDistance = distance;
                    closestIndex = index;
                  }
                },
              );
              onIndexUpdate(closestIndex);

              const progressPercentage =
                closestIndex / routeCoordinatesRef.current.length;
              const remDist =
                totalDistanceRef.current * (1 - progressPercentage);
              const remDur =
                totalDurationRef.current * (1 - progressPercentage);
              onRemainingUpdate(remDist, remDur);

              detectRouteDeviation(actualPosition, minDistance);
              recalculateRouteOnDeviation(actualPosition);

              if (routeCoordinatesRef.current.length > 0) {
                const lastPoint =
                  routeCoordinatesRef.current[
                    routeCoordinatesRef.current.length - 1
                  ];
                if (!lastPoint) {
                  console.log(
                    "[useGpsTracking][DEBUG] GPS: lastPoint null en ruta",
                  );
                } else if (
                  calculateDistance(actualPosition, lastPoint) <
                  DESTINATION_REACHED_RADIUS_METERS
                ) {
                  console.log(
                    "[useGpsTracking] Destino alcanzado (GPS continuo)",
                  );
                  onDestinationReached();
                }
              }
            }
          },
        );
        locationSubscriptionRef.current = subscription;
      } catch (err: any) {
        console.error(
          "[useGpsTracking] Error en tracking GPS continuo:",
          err,
        );
      }
    })();

    return () => {
      if (locationSubscriptionRef.current) {
        console.log("[useGpsTracking] Limpiando tracking GPS continuo");
        locationSubscriptionRef.current.remove();
        locationSubscriptionRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupedWaypoints.length, isTraveling]);
}
