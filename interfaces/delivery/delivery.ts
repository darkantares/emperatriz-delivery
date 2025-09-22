import { AssignmentType } from "@/utils/enum";
import { IGlobalEntity } from "../global";
import { IMunicipio, IProvincia, ISector } from "../location";
import { IDeliveryPerson } from "../carrier";
import { IEnterpriseEntity } from "../auth";
import { IDeliveryStatus } from "./deliveryStatus";
import { IPaymentMethodEntity } from "../payment/payment";

export interface IUpdateDelivery extends Partial<ICreateDeliveryAssigment>{}

export interface IDeliveryAssignmentSummaryEntity extends IGlobalEntity {
  id: number;
  order: number;
  fee: number;
  contact: string;
  cost: number;
  phone: string;
  amountPaid?: number;
  deliveryAddress: string;
  observations?: string;
  provincia: IProvincia;
  shipmentId: string;
  type: AssignmentType;
  municipio: IMunicipio;
  deliveryStatus: IDeliveryStatusEntity;
  shippingDate: string;
  assignedAt: Date;
  acceptedAt: Date;
  completedAt: Date;
  driver: IDeliveryPerson;
  paymentMethod?: IPaymentMethodEntity;
  origin: ISector;
  destiny?: ISector;
  enterprise:IEnterpriseEntity;
}

export interface IDeliveryAssignmentEntity extends IGlobalEntity {
  id: number;
  order: number;
  fee: number;
  contact: string;
  cost: number;
  amountPaid?: number;
  phone: string;
  shipmentId: string;
  type: AssignmentType;
  deliveryAddress: string;
  observations?: string;
  provincia: IProvincia;
  municipio: IMunicipio;
  deliveryStatus: IDeliveryStatusEntity;
  paymentMethod?: IPaymentMethodEntity;
  shippingDate: string;
  assignedAt: Date;
  acceptedAt: Date;
  completedAt: Date;
  driver: IDeliveryPerson;
  origin: ISector;
  destiny: ISector;
  enterprise:IEnterpriseEntity;
}

export interface IDeliveryInfoDto {
  phone: string;
  contact: string;
  cost?: number;
  deliveryAddress: string;
  observations?: string;
  provincia: number;
  municipio: number;
  origin: number;
  destiny: number;
}

export interface ICreateDeliveryAssigment extends IDeliveryInfoDto{
  destinies: IDeliveryInfoDto[]
}


export interface IDeliveryStatusEntity {
  id: number;
  title: IDeliveryStatus;
}

export interface IFeeDelivery {
  id: number;
  value: number;
  description: string;
  origin: number;
  destiny: number;
}