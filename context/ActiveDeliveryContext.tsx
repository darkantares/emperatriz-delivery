import React, { createContext, useContext, useState, useEffect } from 'react';
import { IDeliveryStatus } from '@/interfaces/delivery/deliveryStatus';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

interface ActiveDeliveryContextType {
  activeDelivery: DeliveryItemAdapter | null;
  setActiveDelivery: (delivery: DeliveryItemAdapter | null) => void;
  getNextDeliveryToProcess: (deliveries: DeliveryItemAdapter[]) => DeliveryItemAdapter | null;
  canProcessNewDelivery: (deliveries: DeliveryItemAdapter[]) => boolean;
}

const ActiveDeliveryContext = createContext<ActiveDeliveryContextType | undefined>(undefined);

export const useActiveDelivery = () => {
  const context = useContext(ActiveDeliveryContext);
  if (!context) {
    throw new Error('useActiveDelivery must be used within an ActiveDeliveryProvider');
  }
  return context;
};

export const ActiveDeliveryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeDelivery, setActiveDelivery] = useState<DeliveryItemAdapter | null>(null);

  // Obtener el siguiente delivery a procesar (primer elemento que no esté completado)
  const getNextDeliveryToProcess = (deliveries: DeliveryItemAdapter[]): DeliveryItemAdapter | null => {
    const completedStatuses = [
      // IDeliveryStatus.COMPLETED,
      IDeliveryStatus.RETURNED,
      // IDeliveryStatus.FAILED,
      IDeliveryStatus.CANCELLED
    ];

    // Buscar el primer delivery que no esté completado
    const nextDelivery = deliveries.find(delivery => 
      !completedStatuses.includes(delivery.deliveryStatus.title as IDeliveryStatus)
    );

    return nextDelivery || null;
  };

  // Verificar si se puede procesar un nuevo delivery
  const canProcessNewDelivery = (_deliveries: DeliveryItemAdapter[]): boolean => {
    // No se puede procesar si ya hay un envío activo en el contexto
    return activeDelivery === null;
  };

  return (
    <ActiveDeliveryContext.Provider value={{
      activeDelivery,
      setActiveDelivery,
      getNextDeliveryToProcess,
      canProcessNewDelivery
    }}>
      {children}
    </ActiveDeliveryContext.Provider>
  );
};
