import { IDeliveryAssignmentEntity } from "../delivery/delivery";
import { AssignmentType } from "@/utils/enum";
import { IProvincia, IMunicipio, ISector } from "@/interfaces/location";
import { IDeliveryStatusEntity } from "../delivery/delivery";
import { Capitalize } from "@/utils/capitalize";

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

// Convierte un array de IDeliveryAssignmentEntity a DeliveryItemAdapter
export function adaptDeliveriesToAdapter(deliveries: IDeliveryAssignmentEntity[]): DeliveryItemAdapter[] {
  return deliveries.map(delivery => ({
    id: delivery.id.toString(),
    title: `${Capitalize(delivery.provincia.nombre)}, ${Capitalize(delivery.municipio.nombre)}, ${Capitalize(delivery.origin.nombre)}`,
    client: Capitalize(delivery.contact),
    phone: delivery.phone,
    type: delivery.type,
    deliveryStatus: delivery.deliveryStatus,
    deliveryAddress: delivery.deliveryAddress,
    observations: delivery.observations,
    provincia: delivery.provincia,
    municipio: delivery.municipio,
    origin: delivery.origin,
    destiny: delivery.destiny,
    fee: delivery.fee,
    cost: delivery.cost
  }));
}