import { IPaymentMethodEntity } from '@/interfaces/payment/payment';
import { apiAction } from '@/core/api/apiAction';
import { ApiEndpoints } from '@/utils/api-endpoints';

export const getPaymentMethods = (): Promise<IPaymentMethodEntity[]> =>
    apiAction.get<IPaymentMethodEntity[]>(`${ApiEndpoints.PaymentMethods}`);
