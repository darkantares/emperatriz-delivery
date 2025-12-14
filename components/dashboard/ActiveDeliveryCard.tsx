import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { AssignmentType } from '@/utils/enum';
import { openWhatsAppMessage } from "@/utils/whatsapp";
import { ProgressIconButton } from '@/components/ProgressIconButton';

interface ActiveDeliveryCardProps {
  inProgressDelivery: DeliveryItemAdapter | null;
  onViewTask?: () => void;
}

export const ActiveDeliveryCard = ({ inProgressDelivery, onViewTask }: ActiveDeliveryCardProps) => {
  if (!inProgressDelivery) {
    return null;
  }

  const handleCall = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.length === 0) {
      Alert.alert("Error", "Número de teléfono no disponible");
      return;
    }
    Linking.openURL(`tel:${cleaned}`).catch(() => {
      Alert.alert("Error", "No se puede realizar la llamada");
    });
  };

  // Construir dirección de recogida
  const pickupAddress = `${inProgressDelivery.provincia.nombre}, ${inProgressDelivery.municipio.nombre}, ${inProgressDelivery.origin?.nombre || ''}, ${inProgressDelivery.deliveryAddress}`;

  // Construir dirección de entrega (solo para DELIVERY)
  const deliveryAddress = inProgressDelivery.type === AssignmentType.DELIVERY
    ? `${inProgressDelivery.provincia.nombre}, ${inProgressDelivery.municipio.nombre}, ${inProgressDelivery.destiny?.nombre || ''}, ${inProgressDelivery.deliveryAddress}`
    : '';    
    
  return (
    <TouchableOpacity style={styles.container} onPress={onViewTask} activeOpacity={0.85}>
      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerText}>En Progreso</Text>
      </View>

      <View style={styles.cardContainer} pointerEvents="none">
        <View style={{ flexDirection: 'row', alignItems: 'stretch' }}>
          {/* Columna 1: Información Principal (Cliente, Dirección, Dinero) */}
          <View style={{ flex: 1, paddingRight: 8, justifyContent: 'space-between' }}>
            <View>
              {/* Cliente */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <FontAwesome name="user" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.statusText} numberOfLines={1}>
                  {inProgressDelivery.client}
                  {inProgressDelivery.enterprise && (
                    <Text style={styles.subtitleText}> {inProgressDelivery.enterprise}</Text>
                  )}
                </Text>
              </View>

              {/* Recoger en */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                <MaterialIcons name="store-mall-directory" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.itemDescription}>{pickupAddress}</Text>
              </View>

              {/* Entregar en (solo DELIVERY) */}
              {inProgressDelivery.type === AssignmentType.DELIVERY && (
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                  <MaterialIcons name="location-on" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                  <Text style={styles.itemDescription}>{deliveryAddress}</Text>
                </View>
              )}
            </View>

            {/* Monto a cobrar - Bottom aligned in column */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
              <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
              <Text style={styles.statusText}>
                RD$ {((Number(inProgressDelivery.fee) || 0) + (Number(inProgressDelivery.cost) || 0)).toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Columna 2: Acciones y Estado */}
          <View style={{ alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {/* Columna 3: Botón de Progreso */}
            {onViewTask && (
              <View style={{ justifyContent: 'center' }}>
                <ProgressIconButton onPress={onViewTask} />
              </View>
            )}

            {/* Botones de Acción */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>             
              {/* Call Button */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
                onPress={() => handleCall(inProgressDelivery.phone)}
                activeOpacity={0.7}
              >
                <FontAwesome name="phone" size={28} color={CustomColors.textLight} />
              </TouchableOpacity>

              {/* WhatsApp Button */}
              <TouchableOpacity 
                style={{ flexDirection: 'row', alignItems: 'center', padding: 4 }}
                onPress={() => openWhatsAppMessage(inProgressDelivery.phone, `Hola ${inProgressDelivery.client}`)}
                activeOpacity={0.7}
              >
                <FontAwesome name="whatsapp" size={28} color={CustomColors.textLight} />
              </TouchableOpacity>                
            </View>

            {/* Tipo */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <View style={[
                styles.typeIndicator,
                inProgressDelivery.type === AssignmentType.PICKUP ? styles.pickupIndicator : styles.deliveryIndicator
              ]}>
                <Text style={styles.typeText}>
                  {inProgressDelivery.type === AssignmentType.PICKUP ? 'Recogida' : 'Entrega'}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  subtitleText: {
    fontSize: 13,
    color: CustomColors.textLight,
    opacity: 0.6,
    fontWeight: 'normal',
  },
  container: {
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: CustomColors.textLight,
  },
  expandText: {
    fontSize: 16,
    color: CustomColors.textLight,
  },
  cardContainer: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  itemDescription: {
    fontSize: 14,
    color: CustomColors.textLight,
    opacity: 0.7,
    flex: 1,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginLeft: 2,
    color: CustomColors.textLight,
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
  groupIndicator: {
    backgroundColor: CustomColors.tertiary,
  },
  typeText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  progressBarContainer: {
    marginTop: 8,
    marginBottom: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#E0F2FE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressIndicator: {
    width: '65%',
    height: '100%',
    backgroundColor: '#0EA5E9',
    borderRadius: 3,
  },
  viewTaskButton: {
    backgroundColor: CustomColors.secondary,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 20,
    alignSelf: 'flex-end', // Alinea el botón a la derecha
    marginTop: 8,
  },
  viewTaskButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
  }
});
