export interface IGlobalEntity {
  // Define según necesites, esta interfaz la dejas como vacía o agregas propiedades comunes
  id: number;
}

// Interfaz para datos paginados
export interface PaginatedData<T> {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
}

// Interfaz para la respuesta estándar de la API
export interface ResponseAPI<T> {
  data: T;
  message: string;
  statusCode: number;
  success: boolean;
}

// Interfaz especializada para respuestas paginadas
export interface PaginatedResponseAPI<T> extends ResponseAPI<PaginatedData<T>> {}

// Interfaz para la respuesta de fetch que contiene una ResponseAPI
export interface FetchResponse<T> {
  data: ResponseAPI<T>;
  status: number;
  error?: string;
  details?: any;
  parseError?: boolean;
  networkError?: boolean;
}
