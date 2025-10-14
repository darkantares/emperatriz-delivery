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
  shipmentId: string;
  fee: number;
  cost: number;
  enterprise: string;
}

// Interfaz para representar un grupo de entregas
export interface DeliveryGroupAdapter {
  shipmentId: string;
  pickups: DeliveryItemAdapter[];
  delivery: DeliveryItemAdapter;
  totalFee: number;
  totalCost: number;
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
      shipmentId: delivery.shipmentId,
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

// Función para agrupar entregas por shipmentId cuando isGroup = true
export function groupDeliveriesByShipment(deliveries: DeliveryItemAdapter[]): (DeliveryItemAdapter | DeliveryGroupAdapter)[] {
  const groupedDeliveries: Map<string, DeliveryItemAdapter[]> = new Map();
  const individualDeliveries: DeliveryItemAdapter[] = [];

  // Separar entregas grupales de individuales
  deliveries.forEach(delivery => {
    if (delivery.isGroup) {
      const existing = groupedDeliveries.get(delivery.shipmentId) || [];
      existing.push(delivery);
      groupedDeliveries.set(delivery.shipmentId, existing);
    } else {
      individualDeliveries.push(delivery);
    }
  });

  const result: (DeliveryItemAdapter | DeliveryGroupAdapter)[] = [];

  // Agregar entregas individuales
  result.push(...individualDeliveries);

  // Procesar grupos
  groupedDeliveries.forEach((groupItems, shipmentId) => {
    const pickups = groupItems.filter(item => item.type === AssignmentType.PICKUP);
    const deliveryItem = groupItems.find(item => item.type === AssignmentType.DELIVERY);

    if (deliveryItem) {
      const group: DeliveryGroupAdapter = {
        shipmentId,
        pickups,
        delivery: deliveryItem,
        totalFee: groupItems.reduce((sum, item) => sum + item.fee, 0),
        totalCost: groupItems.reduce((sum, item) => sum + item.cost, 0),
      };
      result.push(group);
    }
  });

  return result;
}