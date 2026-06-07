import { useMemo } from "react";
import { Coordinate, WaypointWithDelivery } from "../types";
import { groupWaypointsByCoordinates } from "../utils/waypointUtils";

export interface TripDerivedDataResult {
  groupedWaypoints: import("../types").WaypointGroup[];
  routeCoordinates: Coordinate[];
  totalDistance: number;
  totalDuration: number;
}

export function useTripDerivedData(
  tripData: any,
  tripDeliveries: any[],
): TripDerivedDataResult {
  const groupedWaypoints = useMemo(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) return [];
    if (!tripData.waypoints || tripData.waypoints.length === 0) return [];

    const waypointsData: WaypointWithDelivery[] = tripData.waypoints
      .flatMap((wp: any, idx: number): WaypointWithDelivery[] => {
        if (!wp) return [];
        if (!wp.location || wp.location.length < 2) return [];
        const delivery =
          wp.assignmentId != null
            ? tripDeliveries.find((d) => d.id === String(wp.assignmentId))
            : tripDeliveries[wp.waypoint_index];
        if (!delivery) return [];
        return [{
          coordinate: {
            latitude: wp.location[1],
            longitude: wp.location[0],
          },
          delivery,
          index: wp.waypoint_index,
        }];
      });

    return groupWaypointsByCoordinates(waypointsData);
  }, [tripData, tripDeliveries]);

  const routeCoordinates = useMemo(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) return [];
    const trip = tripData.trips[0];
    if (!trip || !trip.geometry || !trip.geometry.coordinates) return [];

    return trip.geometry.coordinates
      .flatMap((coord: number[]): Coordinate[] => {
        if (!coord || coord.length < 2 || coord[0] == null || coord[1] == null) return [];
        return [{
          latitude: coord[1],
          longitude: coord[0],
        }];
      });
  }, [tripData]);

  const totalDistance = useMemo(() => {
    if (!tripData?.trips?.[0]) return 0;
    return tripData.trips[0].distance;
  }, [tripData]);

  const totalDuration = useMemo(() => {
    if (!tripData?.trips?.[0]) return 0;
    return tripData.trips[0].duration;
  }, [tripData]);

  return { groupedWaypoints, routeCoordinates, totalDistance, totalDuration };
}
