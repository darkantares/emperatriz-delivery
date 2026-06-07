import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

interface ActiveDeliveryContextType {
  activeDelivery: DeliveryItemAdapter | null;
  setActiveDelivery: (delivery: DeliveryItemAdapter | null) => void;
  getNextDeliveryToProcess: (deliveries: DeliveryItemAdapter[]) => DeliveryItemAdapter | null;
  canProcessNewDelivery: (deliveries: DeliveryItemAdapter[]) => boolean;
}

const ActiveDeliveryContext = createContext<ActiveDeliveryContextType | undefined>(undefined);

function getNextDeliveryToProcess(deliveries: DeliveryItemAdapter[]): DeliveryItemAdapter | null {
  const completedStatuses = [
    // IDeliveryStatus.COMPLETED,
    IDeliveryStatus.RETURNED,
    // IDeliveryStatus.FAILED,
    IDeliveryStatus.CANCELLED
  ];

  const nextDelivery = deliveries.find(delivery => 
    !completedStatuses.includes(delivery.deliveryStatus.title as IDeliveryStatus)
  );

  return nextDelivery || null;
}

export const useActiveDelivery = () => {
  const context = useContext(ActiveDeliveryContext);
  if (!context) {
    throw new Error('useActiveDelivery must be used within an ActiveDeliveryProvider');
  }
  return context;
};

export const ActiveDeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDelivery, setActiveDelivery] = useState<DeliveryItemAdapter | null>(null);

  const canProcessNewDelivery = useCallback((_deliveries: DeliveryItemAdapter[]): boolean => {
    return activeDelivery === null;
  }, [activeDelivery]);

  const contextValue = useMemo(() => ({
    activeDelivery,
    setActiveDelivery,
    getNextDeliveryToProcess,
    canProcessNewDelivery
  }), [activeDelivery, getNextDeliveryToProcess, canProcessNewDelivery]);

  return (
    <ActiveDeliveryContext.Provider value={contextValue}>
      {children}
    </ActiveDeliveryContext.Provider>
  );
};
