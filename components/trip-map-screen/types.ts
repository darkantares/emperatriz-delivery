import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { AssignmentType } from "@/utils/enum";

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface WaypointWithDelivery {
  coordinate: Coordinate;
  delivery: DeliveryItemAdapter;
  index: number;
}

export interface WaypointGroup {
  coordinate: Coordinate;
  deliveries: DeliveryItemAdapter[];
  type: AssignmentType;
  count: number;
  isFirstInRoute: boolean;
  isLastInRoute: boolean;
}

export interface MapWebViewMessage {
  type: string;
  groupIndex?: number;
  deliveryId?: string;
}
