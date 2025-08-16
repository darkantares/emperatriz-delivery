export interface IProvincia {
    id: number;
    nombre: string;
    status:string
}

export interface IMunicipio {
    id: number;
    nombre: string;
    provinciaId: number;
}

export interface ISector {
    id: number;
    nombre: string;
}