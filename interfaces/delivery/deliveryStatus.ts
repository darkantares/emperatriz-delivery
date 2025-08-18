export enum DeliveryStatus {
    PENDING = 'Pendiente',
    IN_PROGRESS = 'En Progreso',
    COMPLETED = 'Completado',
    CANCELLED = 'Cancelado',
    DELIVERED = 'Entregado',
    RETURNED = 'Devuelto',
    FAILED = 'Fallido',
    ON_HOLD = 'En Espera',
    SCHEDULED = 'Programado',
    READY_FOR_PICKUP = 'Listo para Recoger',
    ASSIGNED = 'Asignado',
}

// Define valid status transitions - what status can progress to what other statuses
export const validStatusTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
    [DeliveryStatus.PENDING]: [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.SCHEDULED,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.ON_HOLD,
    ],
    [DeliveryStatus.ASSIGNED]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.ON_HOLD,
        DeliveryStatus.SCHEDULED,
    ],
    [DeliveryStatus.SCHEDULED]: [
        DeliveryStatus.ASSIGNED,
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.ON_HOLD,
    ],
    [DeliveryStatus.IN_PROGRESS]: [
        DeliveryStatus.READY_FOR_PICKUP,
        DeliveryStatus.COMPLETED,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.ON_HOLD,
        DeliveryStatus.CANCELLED,
    ],
    [DeliveryStatus.READY_FOR_PICKUP]: [
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.RETURNED,
        DeliveryStatus.CANCELLED,
    ],
    [DeliveryStatus.COMPLETED]: [
        DeliveryStatus.DELIVERED,
    ],
    [DeliveryStatus.DELIVERED]: [],
    [DeliveryStatus.RETURNED]: [],
    [DeliveryStatus.FAILED]: [
        DeliveryStatus.RETURNED,
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
    ],
    [DeliveryStatus.ON_HOLD]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.SCHEDULED,
    ],
    [DeliveryStatus.CANCELLED]: [],
};

// Helper functions
export function getStatusColor(status: string): string {
    switch (status) {
        case DeliveryStatus.PENDING:
            return '#FFA500';
        case DeliveryStatus.ASSIGNED:
            return '#1976D2';
        case DeliveryStatus.SCHEDULED:
            return '#64B5F6';
        case DeliveryStatus.IN_PROGRESS:
            return '#3498DB';
        case DeliveryStatus.READY_FOR_PICKUP:
            return '#F1C40F';
        case DeliveryStatus.COMPLETED:
            return '#2ECC71';
        case DeliveryStatus.DELIVERED:
            return '#27AE60';
        case DeliveryStatus.RETURNED:
            return '#D35400';
        case DeliveryStatus.FAILED:
            return '#C0392B';
        case DeliveryStatus.ON_HOLD:
            return '#95A5A6';
        case DeliveryStatus.CANCELLED:
            return '#E74C3C';
        default:
            return '#7F8C8D';
    }
}

export function getNextValidStatuses(currentStatus: string): DeliveryStatus[] {
    // Find the matching DeliveryStatus enum value
    const matchingStatus = Object.values(DeliveryStatus).find(
        status => status === currentStatus
    );

    if (matchingStatus) {
        // Return the valid transitions for this status
        const statusKey = Object.keys(DeliveryStatus).find(
            key => DeliveryStatus[key as keyof typeof DeliveryStatus] === matchingStatus
        ) as keyof typeof DeliveryStatus;
        
        return validStatusTransitions[DeliveryStatus[statusKey]];
    }
    
    // If no matching status is found, return an empty array
    return [];
}