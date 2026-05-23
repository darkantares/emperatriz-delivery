import { useEffect } from "react";
import { WaypointGroup } from "../types";

export interface UseWaypointProgressionParams {
  groupedWaypoints: WaypointGroup[];
  completedDeliveryIds: Set<string>;
  currentTargetGroupIndex: number;
  onAdvanceTarget: (nextIndex: number) => void;
}

export function useWaypointProgression(
  params: UseWaypointProgressionParams,
): void {
  const {
    groupedWaypoints,
    completedDeliveryIds,
    currentTargetGroupIndex,
    onAdvanceTarget,
  } = params;

  useEffect(() => {
    if (groupedWaypoints.length === 0) {
      console.log(
        "[useWaypointProgression][DEBUG] auto-advance: groupedWaypoints vacío",
      );
      return;
    }
    if (completedDeliveryIds.size === 0) {
      console.log(
        "[useWaypointProgression][DEBUG] auto-advance: completedDeliveryIds vacío",
      );
      return;
    }
    const currentGroup = groupedWaypoints[currentTargetGroupIndex];
    if (!currentGroup) {
      console.log(
        "[useWaypointProgression][DEBUG] auto-advance: no se encontró currentGroup para index",
        currentTargetGroupIndex,
      );
      return;
    }
    if (!currentGroup.deliveries) {
      console.log(
        "[useWaypointProgression][DEBUG] auto-advance: currentGroup.deliveries es null/undefined",
      );
      return;
    }
    if (
      currentGroup.deliveries.every(
        (d) => d && d.id && completedDeliveryIds.has(d.id),
      ) &&
      currentTargetGroupIndex < groupedWaypoints.length - 1
    ) {
      console.log(
        "[useWaypointProgression][DEBUG] auto-advance: avanzando de grupo",
        currentTargetGroupIndex,
        "->",
        currentTargetGroupIndex + 1,
      );
      onAdvanceTarget(currentTargetGroupIndex + 1);
    }
  }, [
    completedDeliveryIds,
    groupedWaypoints,
    currentTargetGroupIndex,
    onAdvanceTarget,
  ]);
}
