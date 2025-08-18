import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Swipeable } from 'react-native-gesture-handler';
import React, { RefObject } from 'react';
import { CustomColors } from '@/constants/CustomColors';

export interface Item {
  id: string;
  title: string;
  client: string;
  phone: string;  
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
            <View style={styles.infoRow}>
              <Text style={styles.itemTitle}>Dirección:</Text>
              <Text style={styles.itemDescription}>{item.title}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.itemTitle}>Cliente:</Text>
              <Text style={styles.itemDescription}>{item.client}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.itemTitle}>Teléfono:</Text>
              <Text style={styles.itemDescription}>{item.phone}</Text>
            </View>
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
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.divider,
    width: width,
    flexDirection: 'row',
    alignItems: 'center',
  },
  numberContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: CustomColors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.textLight,
    width: 80, // Ancho fijo para alinear todos los valores
  },
  itemDescription: {
    fontSize: 14,
    color: CustomColors.textLight,
    opacity: 0.7,
    flex: 1, // Permite que el texto ocupe el espacio restante
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
