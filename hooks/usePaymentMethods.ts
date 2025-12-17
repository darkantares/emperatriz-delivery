import { useEffect, useState } from "react";
import { paymentMethodService } from "@/services/paymentMethodService";
import { IPaymentMethodEntity } from "@/interfaces/payment/payment";
import { Alert } from "react-native";

export function usePaymentMethods() {
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethodEntity[]>([]);

  useEffect(() => {
    const loadPaymentMethods = async () => {
      try {
        const response = await paymentMethodService.getPaymentMethods();
        if (response.success && response.data) {
          setPaymentMethods(response.data);
        } else {
          Alert.alert("Error", "No se pudieron cargar los métodos de pago");
        }
      } catch {
        Alert.alert("Error", "Error de conexión al cargar los métodos de pago");
      }
    };
    loadPaymentMethods();
  }, []);

  return { paymentMethods };
}
