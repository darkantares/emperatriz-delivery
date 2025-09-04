import { IGlobalEntity } from "./global";

export interface IEnterpriseEntity {
    id: number;
    title: string
    document_verification: string;
    phone: string;
    email: string;
    contact: string;
    contact_phone: string;
    files: string;
    address: string;
    web: string;
}

export interface IUserEntity extends IGlobalEntity {
  id: number;
  isActive: boolean;
  name?: string;
  isAuthenticated: boolean;
  email?: string;
  password: string;
  npassword?: string;
  phone: string;
  firstname: string;
  lastname: string;
  avatar?: string;
  enterprise: IEnterpriseEntity;
}

// export interface IProgramEntity {
//   // Define según necesites
//   id: number;
//   // otras propiedades
// }

export interface PermissionsItemEntity {
  id: number;
  create: boolean;
  remove: boolean;
  update: boolean;
  read: boolean;
//   program: IProgramEntity;
  permission: IPermissionEntity;
}

export interface IPermissionEntity {
  id: number;
  title: string;
  starting_time: string;
  ending_time: string;
  enterprise: IEnterpriseEntity;
//   module: IModuleEntity;
  role: IRolesAllowedEntity;
  permissionsItem: PermissionsItemEntity[];
}

export interface IRolesAllowedEntity {
  id: number;
  order: number;
  title: string;
  status?: string;
  permissions: IPermissionEntity[];
}

// Interfaces de respuesta de autenticación
export interface LoginResponse {
  user: IUserEntity;
  roles: IRolesAllowedEntity[];
  access_token: string;
  refresh_token: string;
}

// Función de utilidad
export function extractTitlesFromRolesAllowed(entity: IRolesAllowedEntity) {
  return entity.title;
}
