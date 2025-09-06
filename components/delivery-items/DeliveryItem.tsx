import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { getStatusColor } from '@/interfaces/delivery/deliveryStatus';
import React from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { AssignmentType } from '@/utils/enum';
import { IProvincia, IMunicipio, ISector } from '@/interfaces/location';

import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';

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
  deliveryStatus: IDeliveryStatusEntity;
  fee: number;
  cost: number;
}

interface DeliveryItemProps {
  item: Item;
  onPress: (id: string) => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({ item, onPress }) => {
  // Formatear teléfono a xxx-xxx-xxxx
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  return (
    <TouchableOpacity onPress={() => onPress(item.id)}>
      <View style={[styles.itemContainer, styles.deliveryContainer]}>
        <View style={styles.contentContainer}>
          {/* Cliente y Teléfono en la misma fila */}
          <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
              <FontAwesome name="user" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
              <Text style={styles.statusText}>{item.client}</Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
              <FontAwesome name="phone" size={16} color={CustomColors.textLight} style={{ marginLeft: 16, marginRight: 6 }} />
              <Text style={styles.statusText}>{formatPhone(item.phone)}</Text>
            </View>

          </View>


          {/* Monto solo si es DELIVERY, tipo y estado siempre */}
          <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
            {/* Monto a cobrar solo si es DELIVERY */}
            {
              item.type === AssignmentType.DELIVERY ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                  <Text style={styles.statusText}>
                    RD$ {(item.fee + item.cost).toFixed(2)}
                  </Text>
                </View>
              ) :
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                  <Text style={styles.statusText}>
                    RD$ 0.00
                  </Text>
                </View>
            }
            {/* Tipo y estado */}
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="assignment" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
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
      </View>
    </TouchableOpacity>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  itemContainer: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.divider,
    width: width,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4, // Separación entre items
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
    fontSize: 14,
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
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
  },
  // ...existing code...
});
