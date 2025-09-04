import { IEnterpriseEntity } from "./auth";
import { IDeliveryAssignmentEntity } from "./delivery/delivery";


export interface IDeliveryPerson {
    id: number;
    firstname: string;
    lastname: string;
    phone: string;
    tuition: string;
    description?: string;
    enterprise?: IEnterpriseEntity
}

export interface IDeliveryPersonWithAssignments extends IDeliveryPerson {
    assignments?: IDeliveryAssignmentEntity[]
}

export interface ICreateCarrier { 
    title: string;
    phone: string;
    description?: string;
}