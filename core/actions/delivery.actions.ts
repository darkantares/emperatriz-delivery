import { IDeliveryAssignmentEntity, IGpsReading, IUpdateDelivery, IUpdateDeliveryStatusData } from '@/interfaces/delivery/delivery';
import { apiAction } from '@/core/api/apiAction';
import { BackendUrls } from '@/utils/enum';
import { adaptDeliveriesToAdapter, DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

export const getDeliveries = (filters?: Partial<IDeliveryAssignmentEntity>): Promise<DeliveryItemAdapter[]> => {
    let queryParams = '';
    if (filters) {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                params.append(key, value.toString());
            }
        });
        queryParams = params.toString() ? `?${params.toString()}` : '';
    }
    return apiAction.get<IDeliveryAssignmentEntity[]>(`${BackendUrls.DeliveryAssignments}/by-driver/${queryParams}`)
        .then(adaptDeliveriesToAdapter);
};

export const getDeliveryById = (id: number): Promise<IDeliveryAssignmentEntity> =>
    apiAction.get<IDeliveryAssignmentEntity>(`${BackendUrls.DeliveryAssignments}/${id}`);

export const getDeliveryDestinies = (deliveryId: number): Promise<IDeliveryAssignmentEntity[]> =>
    apiAction.get<IDeliveryAssignmentEntity[]>(`${BackendUrls.DeliveryAssignments}/${deliveryId}/destinies`);

export const updateDelivery = (id: number, data: IUpdateDelivery): Promise<IDeliveryAssignmentEntity> =>
    apiAction.put<IDeliveryAssignmentEntity>(`${BackendUrls.DeliveryAssignments}/${id}`, data);

export const updateDeliveryStatus = (
    id: string,
    status: number,
    note?: string,
    amountPaid?: number,
    paymentMethodId?: number,
    additionalAmount?: number,
    gpsReadings?: IGpsReading[],
): Promise<IDeliveryAssignmentEntity> => {
    const payload: {
        status: number;
        note?: string;
        amountPaid?: number;
        paymentMethodId?: number;
        additionalAmount?: number;
        gpsReadings?: IGpsReading[];
    } = { status };

    if (note) payload.note = note;
    if (amountPaid !== undefined) payload.amountPaid = amountPaid;
    if (paymentMethodId !== undefined) payload.paymentMethodId = paymentMethodId;
    if (additionalAmount !== undefined) payload.additionalAmount = additionalAmount;
    if (gpsReadings?.length) payload.gpsReadings = gpsReadings;

    return apiAction.patch<IDeliveryAssignmentEntity>(`${BackendUrls.DeliveryAssignments}/${id}/status`, payload);
};

export const updateDeliveryStatusWithImages = (updateData: IUpdateDeliveryStatusData): Promise<IDeliveryAssignmentEntity> => {
    const { id, status, note, imageUris, amountPaid, paymentMethodId, additionalAmount, gpsReadings } = updateData;

    if (!imageUris || imageUris.length === 0) {
        return updateDeliveryStatus(id, status, note, amountPaid, paymentMethodId, additionalAmount, gpsReadings);
    }

    const formData = new FormData();
    formData.append('status', status.toString());
    if (note) formData.append('note', note);
    if (amountPaid !== undefined) formData.append('amountPaid', amountPaid.toString());
    if (paymentMethodId !== undefined) formData.append('paymentMethodId', paymentMethodId.toString());
    if (additionalAmount !== undefined) formData.append('additionalAmount', additionalAmount.toString());
    if (gpsReadings?.length) formData.append('gpsReadings', JSON.stringify(gpsReadings));

    imageUris.forEach((imageUri, index) => {
        formData.append('images', {
            uri: imageUri,
            type: 'image/jpeg',
            name: `delivery_evidence_${id}_${index}_${Date.now()}.jpg`,
        } as any);
    });

    return apiAction.postFormData<IDeliveryAssignmentEntity>(
        `${BackendUrls.DeliveryAssignments}/${id}/status-with-images`,
        formData,
    );
};

export const getOptimizedRoute = (
    courierId: number,
    currentLocation: { lat: number; lng: number },
): Promise<any> =>
    apiAction.post<any>(
        `${BackendUrls.DeliveryAssignments}/courier/${courierId}/optimized-route`,
        { currentLocation },
    );
