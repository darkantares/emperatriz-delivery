import React from 'react';
import { FlatList, StyleSheet, RefreshControl, StyleProp, ViewStyle } from 'react-native';
import { Item, DeliveryItem } from './DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

interface DeliveryItemListProps {
  data: DeliveryItemAdapter[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;

}


export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
}) => {
  const renderItem = ({ item }: { item: DeliveryItemAdapter }) => {
    console.log(item);
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
      isGroup: item.isGroup,
      shipmentId: item.shipmentId,
    };
    return (
      <DeliveryItem 
        item={itemForComponent}
      />
    );
  };

  const getKeyExtractor = (item: DeliveryItemAdapter) => item.id;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={getKeyExtractor}
      style={styles.list}
      contentContainerStyle={contentContainerStyle}
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