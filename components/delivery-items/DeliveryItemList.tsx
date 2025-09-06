import React from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Item, DeliveryItem } from './DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';

interface DeliveryItemListProps {
  data: Item[];
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  refreshing = false,
  onRefresh,
}) => {
  const renderItem = ({ item }: { item: Item }) => (
    <DeliveryItem
      item={item}
      onPress={() => {}} // Sin funcionalidad, solo visual
    />
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
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
