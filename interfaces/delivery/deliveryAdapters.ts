import { AssignmentType } from "@/utils/enum";
import { IProvincia, IMunicipio, ISector } from "@/interfaces/location";
import { IDeliveryStatusEntity } from "../delivery/delivery";

// Interfaz adaptada para trabajar con los datos del backend
export interface DeliveryItemAdapter {
  id: string;
  title: string;
  client: string;
  phone: string;
  type: AssignmentType;
  deliveryStatus: IDeliveryStatusEntity;
  deliveryAddress: string;
  observations?: string;
  provincia: IProvincia;
  municipio: IMunicipio;
  origin: ISector;
  destiny: ISector;
  fee: number;
  cost: number;
}
