export enum AssignmentType {
  PICKUP = 'PICKUP',
  DELIVERY = 'DELIVERY',
}

export enum BackendUrls {
    DeliveryAssignments = 'delivery-assignments',
    DeliveryOriginAddress = 'delivery-origin-address',
    DeliveryStatus = 'delivery-status',
    PaymentMethods = 'payment-methods',
    OsrmRoute = 'admin/osrm/route',
    OsrmTrip = 'admin/osrm/trip',
}

export enum IPaymentValidMethods {
  Efectivo = 'Efectivo',
  Tarjeta = 'Tarjeta',
  Transferencia = 'Transferencia',
  Cheque = 'Cheque',
}