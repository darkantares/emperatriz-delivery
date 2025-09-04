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
            return '#FFA500';
        case IDeliveryStatus.ASSIGNED:
            return '#1976D2';
        case IDeliveryStatus.SCHEDULED:
            return '#64B5F6';
        case IDeliveryStatus.IN_PROGRESS:
            return '#3498DB';
        // case IDeliveryStatus.READY_FOR_PICKUP:
        //     return '#F1C40F';
        // case IDeliveryStatus.COMPLETED:
        //     return '#2ECC71';
        case IDeliveryStatus.DELIVERED:
            return '#27AE60';
        case IDeliveryStatus.RETURNED:
            return '#D35400';
        case IDeliveryStatus.FAILED:
            return '#C0392B';
        case IDeliveryStatus.ON_HOLD:
            return '#95A5A6';
        case IDeliveryStatus.CANCELLED:
            return '#E74C3C';
        default:
            return '#7F8C8D';
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