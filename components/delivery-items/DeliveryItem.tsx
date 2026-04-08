import { StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import React from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { AssignmentType } from '@/utils/enum';

export interface Item {
  id: string;
  title: string;
  client: string;
  phone: string;
  type: AssignmentType;
  deliveryAddress: string;
  currentStatus?: string;
}

interface DeliveryItemProps {
  item: Item;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({ item }) => {
  return (
    <View
      style={[
        styles.itemContainer,
        item.type === AssignmentType.PICKUP ? styles.pickupContainer : styles.deliveryContainer,
      ]}
    >
      <View style={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={styles.infoColumn}>
            <Text style={styles.clientText} numberOfLines={1}>
              {item.client}
            </Text>
            <Text style={styles.addressText} numberOfLines={2}>
              Dirección: {item.deliveryAddress}
            </Text>
          </View>
          <View
            style={[
              styles.typeIndicator,
              item.type === AssignmentType.PICKUP ? styles.pickupIndicator : styles.deliveryIndicator,
            ]}
          >
            <Text style={styles.typeText}>
              {item.type === AssignmentType.PICKUP ? 'Recogida' : 'Entrega'}
            </Text>
          </View>
        </View>
        <View style={styles.metaRow}>
          <Text style={styles.titleText} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={styles.statusText} numberOfLines={1}>
            {item.currentStatus || 'Pendiente'}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    padding: 18,
    borderRadius: 20,
    marginHorizontal: 2,
    marginBottom: 6,
    backgroundColor: CustomColors.backgroundDark,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
  },
  pickupContainer: {
    backgroundColor: CustomColors.cardBackground,
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.quaternary,
  },
  deliveryContainer: {
    backgroundColor: CustomColors.backgroundDark,
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.secondary,
  },
  contentContainer: {
    flex: 1,
    gap: 10,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  infoColumn: {
    flex: 1,
    gap: 6,
  },
  clientText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.textLight,
  },
  addressText: {
    color: CustomColors.textLight,
    fontSize: 13,
    opacity: 0.78,
  },
  typeIndicator: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
  },
  pickupIndicator: {
    backgroundColor: CustomColors.quaternary,
  },
  deliveryIndicator: {
    backgroundColor: CustomColors.secondary,
  },
  typeText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  titleText: {
    color: CustomColors.textLight,
    fontSize: 13,
    opacity: 0.8,
    flex: 1,
  },
  statusText: {
    color: CustomColors.textLight,
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'right',
    minWidth: 90,
  },
});
