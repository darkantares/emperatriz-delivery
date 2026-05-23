import { useEffect, RefObject } from "react";
import { socketService, SocketEventType } from "@/services/websocketService";

export function useSocketRouteUpdates(
  recalculateRef: RefObject<() => Promise<void>>,
): void {
  useEffect(() => {
    const handleNewAssignment = () => {
      console.log(
        "[useSocketRouteUpdates] Evento de ruta requerido recibido, recalculando ruta vía backend",
      );
      recalculateRef.current();
    };

    socketService.on(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
    socketService.on(
      SocketEventType.DRIVERS_GROUP_ASSIGNED,
      handleNewAssignment,
    );
    socketService.on(SocketEventType.DELIVERY_REORDERED, handleNewAssignment);
    socketService.on(
      SocketEventType.DELIVERY_STATUS_UPDATED,
      handleNewAssignment,
    );

    return () => {
      socketService.off(SocketEventType.DRIVER_ASSIGNED, handleNewAssignment);
      socketService.off(
        SocketEventType.DRIVERS_GROUP_ASSIGNED,
        handleNewAssignment,
      );
      socketService.off(
        SocketEventType.DELIVERY_REORDERED,
        handleNewAssignment,
      );
      socketService.off(
        SocketEventType.DELIVERY_STATUS_UPDATED,
        handleNewAssignment,
      );
    };
  }, [recalculateRef]);
}
