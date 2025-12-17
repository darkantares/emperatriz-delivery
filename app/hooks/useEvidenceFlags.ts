import { IDeliveryStatus } from "@/interfaces/delivery/deliveryStatus";
import { IPaymentValidMethods } from "@/utils/enum";

export function useEvidenceFlags(
  selectedStatus: string | null,
  isPickupType: boolean,
  selectedPaymentTitle: string | null,
  amountPaid: string
) {
  const isDelivered = selectedStatus === IDeliveryStatus.DELIVERED;
  const isAmountPaidZero = parseFloat(amountPaid || "0") === 0;

  const showEvidence = isDelivered && !isPickupType;
  const requiresCameraPhoto = showEvidence;

  const requiresGalleryImage =
    !isAmountPaidZero || 
    (selectedPaymentTitle === IPaymentValidMethods.Transferencia);

  return {
    requiresCameraPhoto,
    requiresGalleryImage,
    showEvidence,
    isAmountPaidZero,
  };
}
