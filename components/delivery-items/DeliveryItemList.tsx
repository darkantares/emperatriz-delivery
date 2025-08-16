import React from 'react';
import { FlatList, StyleSheet } from 'react-native';
import { Item, SwipeableRef, DeliveryItem } from './DeliveryItem';

interface DeliveryItemListProps {
  data: Item[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  closeAllSwipeables: (exceptId?: string) => void;
  swipeableRefs: React.MutableRefObject<Map<string, SwipeableRef>>;
  onPressItem: (id: string) => void;
}

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  onEdit,
  onDelete,
  onAdd,
  closeAllSwipeables,
  swipeableRefs,
  onPressItem,
}) => {  
  const renderItem = ({ item }: { item: Item }) => (
    <DeliveryItem
      item={item}
      onEdit={onEdit}
      onDelete={onDelete}
      onAdd={onAdd}
      closeAllSwipeables={closeAllSwipeables}
      swipeableRef={ref => {
        if (ref) {
          swipeableRefs.current.set(item.id, ref);
        } else {
          swipeableRefs.current.delete(item.id);
        }
      }}
      onPress={onPressItem}
    />
  );

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      style={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    width: '100%',
  },
});
