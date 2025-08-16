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
    READY_FOR_PICKUP = 'Listo para Recoger'
}

// Define valid status transitions - what status can progress to what other statuses
export const validStatusTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {    [DeliveryStatus.PENDING]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.ON_HOLD,
        DeliveryStatus.SCHEDULED
    ],
    [DeliveryStatus.IN_PROGRESS]: [
        DeliveryStatus.COMPLETED,
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.ON_HOLD,
        DeliveryStatus.READY_FOR_PICKUP
    ],
    [DeliveryStatus.COMPLETED]: [
        DeliveryStatus.DELIVERED
    ],
    [DeliveryStatus.CANCELLED]: [],
    [DeliveryStatus.DELIVERED]: [],
    [DeliveryStatus.RETURNED]: [],
    [DeliveryStatus.FAILED]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.RETURNED
    ],
    [DeliveryStatus.ON_HOLD]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.SCHEDULED
    ],
    [DeliveryStatus.SCHEDULED]: [
        DeliveryStatus.IN_PROGRESS,
        DeliveryStatus.CANCELLED,
        DeliveryStatus.ON_HOLD
    ],    [DeliveryStatus.READY_FOR_PICKUP]: [
        DeliveryStatus.DELIVERED,
        DeliveryStatus.FAILED,
        DeliveryStatus.RETURNED
    ]
};

// Helper functions
export function getStatusColor(status: string): string {
    switch (status) {
        case DeliveryStatus.PENDING:
            return '#FFA500'; // Orange
        case DeliveryStatus.IN_PROGRESS:
            return '#3498DB'; // Blue
        case DeliveryStatus.COMPLETED:
            return '#2ECC71'; // Green
        case DeliveryStatus.CANCELLED:
            return '#E74C3C'; // Red
        case DeliveryStatus.DELIVERED:
            return '#27AE60'; // Dark Green
        case DeliveryStatus.RETURNED:
            return '#D35400'; // Dark Orange
        case DeliveryStatus.FAILED:
            return '#C0392B'; // Dark Red
        case DeliveryStatus.ON_HOLD:
            return '#95A5A6'; // Gray        case DeliveryStatus.SCHEDULED:
            return '#9B59B6'; // Purple
        case DeliveryStatus.READY_FOR_PICKUP:
            return '#F1C40F'; // Yellow
        default:
            return '#7F8C8D'; // Default Gray
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
