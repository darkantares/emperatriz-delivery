import { IEnterpriseEntity } from "./auth";


export interface ICarrierEntity {
    id: number;
    title: string;
    phone: string;
    tuition: string;
    description?: string;
    enterprise?: IEnterpriseEntity;
}

export interface ICreateCarrier { 
    title: string;
    phone: string;
    description?: string;
}