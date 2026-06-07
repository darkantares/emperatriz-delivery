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
      .map((wp: any, idx: number) => {
        if (!wp) return null;
        if (!wp.location || wp.location.length < 2) return null;
        const delivery =
          wp.assignmentId != null
            ? tripDeliveries.find((d) => d.id === String(wp.assignmentId))
            : tripDeliveries[wp.waypoint_index];
        if (!delivery) return null;
        return {
          coordinate: {
            latitude: wp.location[1],
            longitude: wp.location[0],
          },
          delivery,
          index: wp.waypoint_index,
        };
      })
      .filter(Boolean) as WaypointWithDelivery[];

    return groupWaypointsByCoordinates(waypointsData);
  }, [tripData, tripDeliveries]);

  const routeCoordinates = useMemo(() => {
    if (!tripData || !tripData.trips || tripData.trips.length === 0) return [];
    const trip = tripData.trips[0];
    if (!trip || !trip.geometry || !trip.geometry.coordinates) return [];

    return trip.geometry.coordinates
      .map((coord: number[], idx: number) => {
        if (!coord || coord.length < 2 || coord[0] == null || coord[1] == null) return null;
        return {
          latitude: coord[1],
          longitude: coord[0],
        };
      })
      .filter(Boolean) as Coordinate[];
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
