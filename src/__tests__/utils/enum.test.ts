import { AssignmentType, BackendUrls, IPaymentValidMethods } from '../../../utils/enum';

describe('Enums', () => {
  describe('AssignmentType', () => {
    it('should have PICKUP and DELIVERY values', () => {
      expect(AssignmentType.PICKUP).toBe('PICKUP');
      expect(AssignmentType.DELIVERY).toBe('DELIVERY');
    });

    it('should have exactly 2 values', () => {
      const values = Object.values(AssignmentType);
      expect(values).toHaveLength(2);
      expect(values).toContain('PICKUP');
      expect(values).toContain('DELIVERY');
    });
  });

  describe('BackendUrls', () => {
    it('should have all expected URLs', () => {
      expect(BackendUrls.DeliveryAssignments).toBe('delivery-assignments');
      expect(BackendUrls.DeliveryOriginAddress).toBe('delivery-origin-address');
      expect(BackendUrls.DeliveryStatus).toBe('delivery-status');
      expect(BackendUrls.PaymentMethods).toBe('payment-methods');
      expect(BackendUrls.OsrmRoute).toBe('admin/osrm/route');
      expect(BackendUrls.OsrmTrip).toBe('admin/osrm/trip');
      expect(BackendUrls.CxpInvoices).toBe('cxp-invoices');
    });

    it('should have exactly 7 values', () => {
      const values = Object.values(BackendUrls);
      expect(values).toHaveLength(7);
    });
  });

  describe('IPaymentValidMethods', () => {
    it('should have all payment methods', () => {
      expect(IPaymentValidMethods.Efectivo).toBe('Efectivo');
      expect(IPaymentValidMethods.Tarjeta).toBe('Tarjeta');
      expect(IPaymentValidMethods.Transferencia).toBe('Transferencia');
      expect(IPaymentValidMethods.Cheque).toBe('Cheque');
    });

    it('should have exactly 4 values', () => {
      const values = Object.values(IPaymentValidMethods);
      expect(values).toHaveLength(4);
    });
  });
});
