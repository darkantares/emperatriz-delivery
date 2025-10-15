import React from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Item, DeliveryItem } from './DeliveryItem';
import { DeliveryGroupItem } from './DeliveryGroupItem';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter, DeliveryGroupAdapter, groupDeliveriesByShipment } from '@/interfaces/delivery/deliveryAdapters';

interface DeliveryItemListProps {
  data: DeliveryItemAdapter[];
  refreshing?: boolean;
  onRefresh?: () => void;
  onItemPress?: (item: DeliveryItemAdapter) => void;
}

// Type guard para verificar si el item es un grupo
const isDeliveryGroup = (item: DeliveryItemAdapter | DeliveryGroupAdapter): item is DeliveryGroupAdapter => {
  return 'shipmentId' in item && 'pickups' in item && 'delivery' in item;
};

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  refreshing = false,
  onRefresh,
  onItemPress,
}) => {
  // Agrupar entregas antes de renderizar
  const processedData = groupDeliveriesByShipment(data);

  const renderItem = ({ item }: { item: DeliveryItemAdapter | DeliveryGroupAdapter }) => {
    if (isDeliveryGroup(item)) {
      return (
        <DeliveryGroupItem 
          group={item} 
          onPress={undefined} // Las entregas agrupadas no pueden abrir modal directamente
        />
      );
    } else {
      // Convertir DeliveryItemAdapter a Item para compatibilidad
      const itemForComponent: Item = {
        id: item.id,
        title: item.title,
        client: item.client,
        phone: item.phone,
        type: item.type,
        deliveryAddress: item.deliveryAddress,
        provincia: item.provincia,
        municipio: item.municipio,
        origin: item.origin,
        destiny: item.destiny,
        deliveryStatus: item.deliveryStatus,
        fee: item.fee,
        cost: item.cost,
        enterprise: item.enterprise,
      };
      return (
        <DeliveryItem 
          item={itemForComponent}
          onPress={onItemPress ? () => onItemPress(item) : undefined}
        />
      );
    }
  };

  const getKeyExtractor = (item: DeliveryItemAdapter | DeliveryGroupAdapter) => {
    if (isDeliveryGroup(item)) {
      return `group-${item.shipmentId}`;
    } else {
      return item.id;
    }
  };

  return (
    <FlatList
      data={processedData}
      renderItem={renderItem}
      keyExtractor={getKeyExtractor}
      style={styles.list}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[CustomColors.secondary]}
          tintColor={CustomColors.secondary}
          progressBackgroundColor={CustomColors.backgroundDark}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
});
