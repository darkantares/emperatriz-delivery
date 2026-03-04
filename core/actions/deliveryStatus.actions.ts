import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { apiAction } from '@/core/api/apiAction';
import { BackendUrls } from '@/utils/enum';

export const getDeliveryStatuses = (): Promise<IDeliveryStatusEntity[]> =>
    apiAction.get<IDeliveryStatusEntity[]>(`${BackendUrls.DeliveryStatus}`);

export const getDeliveryStatusById = (id: number): Promise<IDeliveryStatusEntity> =>
    apiAction.get<IDeliveryStatusEntity>(`${BackendUrls.DeliveryStatus}/${id}`);
