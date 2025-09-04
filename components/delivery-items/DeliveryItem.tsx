import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import React from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { AssignmentType } from '@/utils/enum';
import { IProvincia, IMunicipio, ISector } from '@/interfaces/location';

export interface Item {
  id: string;
  title: string;
  client: string;
  phone: string;
  type: AssignmentType;
  deliveryAddress: string;
  provincia: IProvincia;
  municipio: IMunicipio;
  origin: ISector;
  destiny: ISector;
}

interface DeliveryItemProps {
  item: Item;
  onPress: (id: string) => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({ item, onPress }) => {
  // Determinar el estilo según el tipo de asignación
  const containerStyle = item.type === AssignmentType.PICKUP 
    ? [styles.itemContainer, styles.pickupContainer]
    : [styles.itemContainer, styles.deliveryContainer];

  // Construir dirección de recogida
  const pickupAddress = `${item.provincia.nombre}, ${item.municipio.nombre}, ${item.origin.nombre}, ${item.deliveryAddress}`;
  
  // Construir dirección de entrega (solo para DELIVERY)
  const deliveryAddress = item.type === AssignmentType.DELIVERY 
    ? `${item.provincia.nombre}, ${item.municipio.nombre}, ${item.destiny.nombre}, ${item.deliveryAddress}`
    : '';

  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <View style={containerStyle}>
        <View style={styles.numberContainer}>
          <Text style={styles.numberText}>{item.id}</Text>
        </View>
        <View style={styles.contentContainer}>
          <View style={styles.infoRow}>
            <Text style={styles.itemTitle}>Cliente:</Text>
            <Text style={styles.itemDescription}>{item.client}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.itemTitle}>Teléfono:</Text>
            <Text style={styles.itemDescription}>{item.phone}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.itemTitle}>Recoger En:</Text>
            <Text style={styles.itemDescription}>{pickupAddress}</Text>
          </View>
          {item.type === AssignmentType.DELIVERY && (
            <View style={styles.infoRow}>
              <Text style={styles.itemTitle}>Entregar En:</Text>
              <Text style={styles.itemDescription}>{deliveryAddress}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.itemTitle}>Tipo:</Text>
            <View style={[
              styles.typeIndicator, 
              item.type === AssignmentType.PICKUP ? styles.pickupIndicator : styles.deliveryIndicator
            ]}>
              <Text style={styles.typeText}>
                {item.type === AssignmentType.PICKUP ? 'Recogida' : 'Entrega'}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  itemContainer: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.divider,
    width: width,
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupContainer: {
    backgroundColor: CustomColors.cardBackground, // Fondo para tipo PICKUP (más claro)
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.quaternary, // Borde morado para PICKUP
  },
  deliveryContainer: {
    backgroundColor: CustomColors.backgroundDark, // Fondo para tipo DELIVERY (más oscuro)
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.secondary, // Borde dorado para DELIVERY
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
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
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
    fontWeight: 'bold',
  },
  // ...existing code...
});
