import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Address } from '@/components/delivery-items/AddressListItem';

interface AppContextType {
  selectedAddresses: {
    elementId: string;
    elementTitle: string;
    addresses: Address[];
  } | null;
  setSelectedAddresses: (data: {
    elementId: string;
    elementTitle: string;
    addresses: Address[];
  } | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [selectedAddresses, setSelectedAddresses] = useState<{
    elementId: string;
    elementTitle: string;
    addresses: Address[];
  } | null>(null);

  return (
    <AppContext.Provider value={{ selectedAddresses, setSelectedAddresses }}>
      {children}
    </AppContext.Provider>
  );
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}
