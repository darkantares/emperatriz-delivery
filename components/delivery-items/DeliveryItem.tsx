import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Swipeable } from 'react-native-gesture-handler';
import React, { RefObject } from 'react';
import { CustomColors } from '@/constants/CustomColors';

export interface Item {
  id: string;
  title: string;
  description: string;
}

export type SwipeableRef = Swipeable | null;

interface DeliveryItemProps {
  item: Item;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onAdd: (id: string) => void;
  closeAllSwipeables: (exceptId?: string) => void;
  swipeableRef: (ref: SwipeableRef) => void;
  onPress: (id: string) => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({
  item,
  onEdit,
  onDelete,
  onAdd,
  closeAllSwipeables,
  swipeableRef,
  onPress,
}) => {  const renderLeftActions = () => (
    <View style={styles.leftActions}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: CustomColors.tertiary }]}
        onPress={() => {
          onAdd(item.id);
          closeAllSwipeables();
        }}
      >
        <Text style={styles.actionText}>Añadir</Text>
      </TouchableOpacity>
    </View>
  );

  const renderRightActions = () => (
    <View style={styles.rightActions}>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: CustomColors.quaternary }]}
        onPress={() => {
          onEdit(item.id);
          closeAllSwipeables();
        }}
      >
        <Text style={styles.actionText}>Editar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: CustomColors.primary }]}
        onPress={() => {
          onDelete(item.id);
          closeAllSwipeables();
        }}
      >
        <Text style={styles.actionText}>Eliminar</Text>
      </TouchableOpacity>
    </View>
  );  return (
    <Swipeable
      ref={swipeableRef}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableOpen={() => closeAllSwipeables(item.id)}
    >
      <TouchableOpacity onPress={() => onPress(item.id)}>
        <View style={styles.itemContainer}>
          <View style={styles.numberContainer}>
            <Text style={styles.numberText}>{item.id}</Text>
          </View>
          <View style={styles.contentContainer}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.itemDescription}>{item.description}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: CustomColors.cardBackground,
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.divider,
    width: width,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: CustomColors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  numberText: {
    color: CustomColors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  contentContainer: {
    flex: 1,
    paddingRight: 10,
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.textLight,
  },
  itemDescription: {
    fontSize: 14,
    color: CustomColors.textLight,
    opacity: 0.7,
    marginTop: 5,
  },
  leftActions: {
    flexDirection: 'row',
    width: 100,
    height: '100%',
  },
  rightActions: {
    flexDirection: 'row',
    width: 200,
    height: '100%',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    padding: 10,
  },
});
