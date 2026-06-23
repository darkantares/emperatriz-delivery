import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { apiAction } from '@/core/api/apiAction';
import { ApiEndpoints } from '@/utils/api-endpoints';

export const getDeliveryStatuses = (): Promise<IDeliveryStatusEntity[]> =>
    apiAction.get<IDeliveryStatusEntity[]>(`${ApiEndpoints.DeliveryStatus}`);

const getDeliveryStatusById = (id: number): Promise<IDeliveryStatusEntity> =>
    apiAction.get<IDeliveryStatusEntity>(`${ApiEndpoints.DeliveryStatusById}`.replace('{id}', String(id)));
