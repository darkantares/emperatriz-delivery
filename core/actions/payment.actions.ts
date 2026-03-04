import { IPaymentMethodEntity } from '@/interfaces/payment/payment';
import { apiAction } from '@/core/api/apiAction';
import { BackendUrls } from '@/utils/enum';

export const getPaymentMethods = (): Promise<IPaymentMethodEntity[]> =>
    apiAction.get<IPaymentMethodEntity[]>(`${BackendUrls.PaymentMethods}`);
