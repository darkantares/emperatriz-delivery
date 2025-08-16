import { IDeliveryDestinyEntity } from "../delivery/delivery";
import { DeliveryStatus } from "../delivery/deliveryStatus";

export interface DeliveryAssigned {
  message: string;
  destiny: {id: number, deliveryStatus: DeliveryStatus};
  deliveryId: number;
  timestamp: string;
}