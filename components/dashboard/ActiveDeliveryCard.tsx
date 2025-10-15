import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter, groupDeliveriesByShipment, DeliveryGroupAdapter } from '@/interfaces/delivery/deliveryAdapters';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { AssignmentType } from '@/utils/enum';

interface ActiveDeliveryCardProps {
  inProgressDelivery: DeliveryItemAdapter | null;
  deliveries: DeliveryItemAdapter[]; // Para detectar si pertenece a un grupo
  onViewTask?: () => void;
}

export const ActiveDeliveryCard = ({ inProgressDelivery, deliveries, onViewTask }: ActiveDeliveryCardProps) => {
  if (!inProgressDelivery) {
    return null;
  }

  // Type guard para verificar si el item es un grupo
  const isDeliveryGroup = (item: DeliveryItemAdapter | DeliveryGroupAdapter): item is DeliveryGroupAdapter => {
    return 'shipmentId' in item && 'pickups' in item && 'delivery' in item;
  };

  // Detectar si el delivery activo pertenece a un grupo
  const getGroupInfo = () => {
    if (!inProgressDelivery.isGroup || !inProgressDelivery.shipmentId) {
      return null;
    }

    // Crear un array temporal que incluya el delivery en progreso para el agrupamiento
    const allDeliveries = [...deliveries, inProgressDelivery];
    const processedData = groupDeliveriesByShipment(allDeliveries);
    
    // Buscar el grupo al que pertenece el delivery activo
    const group = processedData.find(item => {
      if (isDeliveryGroup(item)) {
        const groupItem = item as DeliveryGroupAdapter;
        // Verificar si el delivery activo es el delivery del grupo o uno de los pickups
        return groupItem.delivery.id === inProgressDelivery.id ||
               groupItem.pickups.some(pickup => pickup.id === inProgressDelivery.id);
      }
      return false;
    }) as DeliveryGroupAdapter | undefined;

    return group || null;
  };

  const groupInfo = getGroupInfo();

  // Formatear teléfono a xxx-xxx-xxxx
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0,3)}-${cleaned.slice(3,6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // Construir dirección de recogida
  const pickupAddress = `${inProgressDelivery.provincia.nombre}, ${inProgressDelivery.municipio.nombre}, ${inProgressDelivery.origin?.nombre || ''}, ${inProgressDelivery.deliveryAddress}`;

  // Construir dirección de entrega (solo para DELIVERY)
  const deliveryAddress = inProgressDelivery.type === AssignmentType.DELIVERY
    ? `${inProgressDelivery.provincia.nombre}, ${inProgressDelivery.municipio.nombre}, ${inProgressDelivery.destiny?.nombre || ''}, ${inProgressDelivery.deliveryAddress}`
    : '';

    console.log('inProgressDelivery', inProgressDelivery);
    
  return (
    <TouchableOpacity style={styles.container} onPress={onViewTask} activeOpacity={0.85}>
      <View style={styles.header} pointerEvents="none">
        <Text style={styles.headerText}>En Progreso</Text>
      </View>

      <View style={styles.cardContainer} pointerEvents="none">
        {/* Cliente y Teléfono en la misma fila */}
        <View style={styles.infoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            <FontAwesome name="user" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>
              {inProgressDelivery.client}
              {inProgressDelivery.enterprise && (
                <Text style={styles.subtitleText}> {inProgressDelivery.enterprise}</Text>
              )}
            </Text>

          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 8 }}>
            <FontAwesome name="phone" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>{formatPhone(inProgressDelivery.phone)}</Text>
          </View>
        </View>

        {/* Recoger en */}
        <View style={styles.infoRow}>
          <MaterialIcons name="store-mall-directory" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
          <Text style={styles.itemDescription}>{pickupAddress}</Text>
        </View>

        {/* Entregar en (solo DELIVERY) */}
        {inProgressDelivery.type === AssignmentType.DELIVERY && (
          <View style={styles.infoRow}>
            <MaterialIcons name="location-on" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.itemDescription}>{deliveryAddress}</Text>
          </View>
        )}

        {/* Información del grupo si aplica */}
        {groupInfo && (
          <View style={styles.groupInfoContainer}>
            <View style={styles.infoRow}>
              <MaterialIcons name="group-work" size={16} color={CustomColors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.groupInfoText}>
                Parte de un grupo: {groupInfo.pickups.length} recogida{groupInfo.pickups.length > 1 ? 's' : ''} → 1 entrega
              </Text>
            </View>
            <View style={styles.infoRow}>
              <FontAwesome name="info-circle" size={16} color={CustomColors.secondary} style={{ marginRight: 6 }} />
              <Text style={styles.groupProgressText}>
                {inProgressDelivery.type === AssignmentType.PICKUP
                  ? `Recogiendo ${groupInfo.pickups.findIndex(p => p.id === inProgressDelivery.id) + 1} de ${groupInfo.pickups.length}`
                  : 'Entregando al destino final'
                }
              </Text>
            </View>
          </View>
        )}

        {/* Monto y tipo */}
        <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
          {/* Monto a cobrar */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
            <Text style={styles.statusText}>
              {groupInfo ? (
                <>RD$ {groupInfo.totalFee.toFixed(2)} <Text style={styles.subtitleText}>(total grupo)</Text></>
              ) : (
                <>RD$ {((inProgressDelivery.fee || 0) + (inProgressDelivery.cost || 0)).toFixed(2)}</>
              )}
            </Text>
          </View>
          
          {/* Tipo */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <MaterialIcons name="assignment" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
            <View style={[
              styles.typeIndicator,
              groupInfo ? styles.groupIndicator : (
                inProgressDelivery.type === AssignmentType.PICKUP ? styles.pickupIndicator : styles.deliveryIndicator
              )
            ]}>
              <Text style={styles.typeText}>
                {groupInfo 
                  ? 'Grupo' 
                  : (inProgressDelivery.type === AssignmentType.PICKUP ? 'Recogida' : 'Entrega')
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Barra de progreso */}
        {/* <View style={styles.progressBarContainer}>
          <View style={styles.progressBar}>
            <View style={styles.progressIndicator} />
          </View>
        </View> */}
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
  groupInfoContainer: {
    backgroundColor: 'rgba(108, 79, 234, 0.1)', // Color morado tenue
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: CustomColors.secondary,
  },
  groupInfoText: {
    fontSize: 14,
    color: CustomColors.secondary,
    fontWeight: 'bold',
    flex: 1,
  },
  groupProgressText: {
    fontSize: 13,
    color: CustomColors.secondary,
    flex: 1,
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
    backgroundColor: CustomColors.secondary,
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
