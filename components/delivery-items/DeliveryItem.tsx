import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import React from 'react';
import { CustomColors } from '@/constants/CustomColors';

export interface Item {
  id: string;
  title: string;
  client: string;
  phone: string;
}

interface DeliveryItemProps {
  item: Item;
  onPress: (id: string) => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({ item, onPress }) => (
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
);

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
  // ...existing code...
});
