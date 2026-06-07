import { useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { getPaymentMethods } from '@/core/actions/payment.actions';
import { IPaymentMethodEntity } from '@/interfaces/payment/payment';

export function usePaymentMethods() {
    const [paymentMethods, setPaymentMethods] = useState<IPaymentMethodEntity[]>([]);

    useEffect(() => {
        let cancelled = false;
        const loadPaymentMethods = async () => {
            try {
                const data = await getPaymentMethods();
                if (!cancelled) setPaymentMethods(data);
            } catch {
                if (!cancelled) Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
            }
        };
        loadPaymentMethods();
        return () => { cancelled = true; };
    }, []);

    return { paymentMethods };
}
