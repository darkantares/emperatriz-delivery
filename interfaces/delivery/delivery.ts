import { IEnterpriseEntity, IUserEntity } from "../auth";
import { ICarrierEntity } from "../carrier";
import { IGlobalEntity } from "../global";
import { IMunicipio, IProvincia, ISector } from "../location";

export interface ICreateDelivery {
  contactPerson: string;
  contactPhone: string;
  provinciaOrigen: IProvincia;
  municipioOrigen: IMunicipio;
  sectorOrigen: ISector;
  origin: number;
  destinies: IDeliveryDestinyEntity[];
  statusHistory?: DeliveryStatusHistoryEntity[];
  assignments?: DeliveryAssignmentEntity[];
  driver?: ICarrierEntity;
  enterprise?: IEnterpriseEntity;
}

export interface IUpdateDelivery extends Partial<ICreateDelivery>{}

export interface IDelivery extends IGlobalEntity{
  id: number;
  contactPerson: string;
  contactPhone: string;
  provinciaOrigen: IProvincia;
  municipioOrigen: IMunicipio;
  sectorOrigen: ISector;
  destinies: IDeliveryDestinyEntity[];
  statusHistory: DeliveryStatusHistoryEntity[];
  assignments: DeliveryAssignmentEntity[];
  driver: ICarrierEntity;
  enterprise: IEnterpriseEntity;  
}

export interface IDeliveryDestinyEntity {
  id: number;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryStatus?: string;
  shippingDate?: string;
  cost: number;
  amount: number;
  order: number;
  observations?: string;  
  driver?: ICarrierEntity;
  provincia: IProvincia;
  municipio: IMunicipio;
  sector: ISector;
  destiny: number;
  fee?: number;
}

export interface DeliveryStatusHistoryEntity {
  id: number;
  status: string;
  comments: string;
  changedBy: IUserEntity;
  timestamp: Date;
  location: string;
  delivery: ICarrierEntity;
}

export interface DeliveryAssignmentEntity {
  id: number;
  status: string;
  assignedAt: Date;
  acceptedAt: Date;
  completedAt: Date;
  notes: string;
  driver: ICarrierEntity;
  delivery: IDelivery;
}

export interface IFeeDelivery {
  id: number;
  fee: number;
  description: string;
  origin: number;
  destiny: number;
}