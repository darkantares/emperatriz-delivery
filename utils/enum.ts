export enum AssignmentType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export enum BackendUrls {
    DeliveryAssignments = 'delivery-assignments',
    DeliveryOriginAddress = 'delivery-origin-address',
    DeliveryStatus = 'delivery-status',
    PaymentMethods = 'payment-methods',
}

export enum IPaymentValidMethods {
  Efectivo = 'Efectivo',
  Tarjeta = 'Tarjeta',
  Transferencia = 'Transferencia',
  Cheque = 'Cheque',
}