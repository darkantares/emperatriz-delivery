export enum IDeliveryStatus {
    PENDING = 'Pendiente',
    ASSIGNED = 'Asignado',
    IN_PROGRESS = 'En Progreso',
    DELIVERED = 'Entregado',
    COMPLETED = 'Completado',
    FAILED = 'Fallido',    
    CANCELLED = 'Cancelado',
    RETURNED = 'Devuelto',
    ON_HOLD = 'En Espera',
    SCHEDULED = 'Programado',
}

// Define valid status transitions - what status can progress to what other statuses
export const validStatusTransitions: Record<IDeliveryStatus, IDeliveryStatus[]> = {
    [IDeliveryStatus.PENDING]: [
        IDeliveryStatus.ASSIGNED,
        IDeliveryStatus.SCHEDULED,
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.ON_HOLD,
    ],
    [IDeliveryStatus.ASSIGNED]: [
        IDeliveryStatus.IN_PROGRESS,
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.ON_HOLD,
        IDeliveryStatus.SCHEDULED,
    ],
    [IDeliveryStatus.SCHEDULED]: [
        IDeliveryStatus.ASSIGNED,
        IDeliveryStatus.IN_PROGRESS,
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.ON_HOLD,
    ],
    [IDeliveryStatus.IN_PROGRESS]: [
        // IDeliveryStatus.READY_FOR_PICKUP,
        // IDeliveryStatus.COMPLETED,
        IDeliveryStatus.DELIVERED,
        IDeliveryStatus.FAILED,
        IDeliveryStatus.ON_HOLD,
        IDeliveryStatus.CANCELLED,
    ],
    // [DeliveryStatus.READY_FOR_PICKUP]: [
    //     DeliveryStatus.DELIVERED,
    //     DeliveryStatus.FAILED,
    //     DeliveryStatus.RETURNED,
    //     DeliveryStatus.CANCELLED,
    // ],
    // [DeliveryStatus.COMPLETED]: [
    //     DeliveryStatus.DELIVERED,
    // ],
    [IDeliveryStatus.DELIVERED]: [],
    [IDeliveryStatus.RETURNED]: [],
    [IDeliveryStatus.FAILED]: [
        IDeliveryStatus.RETURNED,
        IDeliveryStatus.IN_PROGRESS,
        IDeliveryStatus.CANCELLED,
    ],
    [IDeliveryStatus.ON_HOLD]: [
        IDeliveryStatus.IN_PROGRESS,
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.SCHEDULED,
    ],
    [IDeliveryStatus.CANCELLED]: [],
    [IDeliveryStatus.COMPLETED]: [],
};

// Helper functions
export function getStatusColor(status: string): string {
    switch (status) {
        case IDeliveryStatus.PENDING:
            return '#FF00FF'; // Magenta
        case IDeliveryStatus.ASSIGNED:
            return '#00BFFF'; // Azul intenso
        case IDeliveryStatus.SCHEDULED:
            return '#FFD700'; // Amarillo
        case IDeliveryStatus.IN_PROGRESS:
            return '#00FF00'; // Verde puro
        case IDeliveryStatus.COMPLETED:
            return '#0011ffff'; // Naranja fuerte
        case IDeliveryStatus.DELIVERED:
            return '#8A2BE2'; // Violeta
        case IDeliveryStatus.RETURNED:
            return '#00CED1'; // Turquesa
        case IDeliveryStatus.FAILED:
            return '#FF0000'; // Rojo puro
        case IDeliveryStatus.ON_HOLD:
            return '#A52A2A'; // Marrón
        case IDeliveryStatus.CANCELLED:
            return '#FF4500'; // Negro
        default:
            return '#7F8C8D'; // Gris
    }
}

export function getNextValidStatuses(currentStatus: string): IDeliveryStatus[] {
    // Find the matching DeliveryStatus enum value
    const matchingStatus = Object.values(IDeliveryStatus).find(
        status => status === currentStatus
    );

    if (matchingStatus) {
        // Return the valid transitions for this status
        const statusKey = Object.keys(IDeliveryStatus).find(
            key => IDeliveryStatus[key as keyof typeof IDeliveryStatus] === matchingStatus
        ) as keyof typeof IDeliveryStatus;
        
        return validStatusTransitions[IDeliveryStatus[statusKey]];
    }
    
    // If no matching status is found, return an empty array
    return [];
}