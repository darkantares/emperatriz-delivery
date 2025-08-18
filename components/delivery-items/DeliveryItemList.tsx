import React from 'react';
import { FlatList, StyleSheet, RefreshControl } from 'react-native';
import { Item, DeliveryItem } from './DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';

interface DeliveryItemListProps {
  data: Item[];
  onPressItem: (id: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  onPressItem,
  refreshing = false,
  onRefresh,
}) => {
  const renderItem = ({ item }: { item: Item }) => (
    <DeliveryItem
      item={item}
      onPress={onPressItem}
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
