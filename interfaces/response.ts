export interface ResponseAPI<T>{
    statusCode: number,
    message: string,
    data: T
}

export interface ResponsePaginatedAPI<T>{
    status: number,
    message: string,
    data: ResponseDataAPI<T>
}

export interface ResponseDataAPI<T>{
    data: T,
    total:number
}
