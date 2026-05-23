import { WaypointWithDelivery, WaypointGroup } from "../types";

export function groupWaypointsByCoordinates(
  waypoints: WaypointWithDelivery[],
): WaypointGroup[] {
  const groupsMap = new Map<string, WaypointGroup>();
  let skippedNoDelivery = 0;
  let skippedNoCoord = 0;

  waypoints.forEach((waypoint, waypointIndex) => {
    if (!waypoint) {
      console.log(
        "[groupWaypointsByCoordinates] waypoint null en index",
        waypointIndex,
      );
      skippedNoDelivery++;
      return;
    }
    if (!waypoint.coordinate) {
      console.log(
        "[groupWaypointsByCoordinates] waypoint.coordinate null en index",
        waypointIndex,
        "deliveryId:",
        waypoint.delivery?.id,
      );
      skippedNoCoord++;
      return;
    }
    if (
      waypoint.coordinate.latitude == null ||
      waypoint.coordinate.longitude == null
    ) {
      console.log(
        "[groupWaypointsByCoordinates] coordinate lat/lng null en index",
        waypointIndex,
        "coordinate:",
        JSON.stringify(waypoint.coordinate),
      );
    }
    if (!waypoint.delivery) {
      skippedNoDelivery++;
      return;
    }
    if (waypoint.delivery.type == null) {
      console.log(
        "[groupWaypointsByCoordinates] delivery.type null en index",
        waypointIndex,
        "delivery:",
        JSON.stringify(waypoint.delivery),
      );
    }
    const key = `${waypoint.coordinate.latitude},${waypoint.coordinate.longitude},${waypoint.delivery.type}`;

    if (groupsMap.has(key)) {
      const existingGroup = groupsMap.get(key)!;
      existingGroup.deliveries.push(waypoint.delivery);
      existingGroup.count = existingGroup.deliveries.length;
    } else {
      groupsMap.set(key, {
        coordinate: waypoint.coordinate,
        deliveries: [waypoint.delivery],
        type: waypoint.delivery?.type,
        count: 1,
        isFirstInRoute: waypointIndex === 0,
        isLastInRoute: waypointIndex === waypoints.length - 1,
      });
    }
  });

  const groups = Array.from(groupsMap.values());
  console.log(
    `[groupWaypointsByCoordinates] Agrupación completa: ${waypoints.length} waypoints -> ${groups.length} grupos (skipped: ${skippedNoDelivery} sin delivery, ${skippedNoCoord} sin coordenada)`,
  );
  return groups;
}
