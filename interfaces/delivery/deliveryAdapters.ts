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
  origin?: ISector;
  destiny?: ISector;
  isGroup: boolean;
  fee: number;
  cost: number;
  enterprise: string;
}

// Convierte un array de IDeliveryAssignmentEntity a DeliveryItemAdapter
export function adaptDeliveriesToAdapter(deliveries: IDeliveryAssignmentEntity[]): DeliveryItemAdapter[] {
  try {
    return deliveries.map(delivery => ({
      id: delivery.id.toString(),
      title: `${Capitalize(delivery.provincia.nombre)}, ${Capitalize(delivery.municipio.nombre)}, ${Capitalize(delivery.origin?.nombre || '')}`,
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
      isGroup: delivery.isGroup || false,
      fee: delivery.fee,
      cost: delivery.cost,
      enterprise: delivery.enterprise.title,
    }));    
  } catch (error) {
    console.log(deliveries);    
    console.error('Error al adaptar entregas:', error);
    return [];
  }
}