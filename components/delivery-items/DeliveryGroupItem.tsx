import React, { useState } from 'react';
import { StyleSheet, Dimensions, View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { FontAwesome, MaterialIcons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryGroupAdapter } from '@/interfaces/delivery/deliveryAdapters';

interface DeliveryGroupItemProps {
  group: DeliveryGroupAdapter;
  onPress?: () => void;
}

export const DeliveryGroupItem: React.FC<DeliveryGroupItemProps> = ({ group, onPress }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const formatPhone = (phone: string) => {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    }
  };

  return (
    <View style={[styles.itemContainer, styles.groupContainer]}>
      {/* Header del grupo */}
      <View style={styles.groupHeader}>
        {/* Botón para expandir/contraer */}
        <TouchableOpacity onPress={toggleExpanded} style={styles.expandButton}>
          <View style={[styles.infoRow, { justifyContent: 'space-between', marginBottom: 0 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <MaterialIcons name="group-work" size={20} color={CustomColors.secondary} style={{ marginRight: 8 }} />
              <Text style={styles.groupTitle}>Entrega Agrupada ({group.pickups.length} recogidas)</Text>
            </View>
            <FontAwesome 
              name={isExpanded ? "chevron-up" : "chevron-down"} 
              size={16} 
              color={CustomColors.textLight} 
            />
          </View>
        </TouchableOpacity>

        {/* Información del destino */}
        {onPress ? (
          <TouchableOpacity onPress={handlePress} style={styles.deliveryInfoSection}>
            <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FontAwesome name="user" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>{group.delivery.client}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome name="phone" size={16} color={CustomColors.textLight} style={{ marginLeft: 16, marginRight: 6 }} />
                <Text style={styles.statusText}>{formatPhone(group.delivery.phone)}</Text>
              </View>
            </View>

            {/* Monto total y estado */}
            <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>
                  Total: RD$ {(group.totalFee + group.totalCost).toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="assignment" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <View style={[styles.typeIndicator, styles.groupIndicator]}>
                  <Text style={styles.typeText}>Grupo</Text>
                </View>
              </View>
            </View>

            {/* Indicador visual de que es clickeable */}
            <View style={styles.clickIndicator}>
              <FontAwesome name="chevron-right" size={12} color={CustomColors.secondary} />
            </View>
          </TouchableOpacity>
        ) : (
          <View style={[styles.deliveryInfoSection, styles.nonClickableSection]}>
            <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <FontAwesome name="user" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>{group.delivery.client}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome name="phone" size={16} color={CustomColors.textLight} style={{ marginLeft: 16, marginRight: 6 }} />
                <Text style={styles.statusText}>{formatPhone(group.delivery.phone)}</Text>
              </View>
            </View>

            {/* Monto total y estado */}
            <View style={[styles.infoRow, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <FontAwesome name="money" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <Text style={styles.statusText}>
                  Total: RD$ {(group.totalFee + group.totalCost).toFixed(2)}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <MaterialIcons name="assignment" size={16} color={CustomColors.textLight} style={{ marginRight: 6 }} />
                <View style={[styles.typeIndicator, styles.groupIndicator]}>
                  <Text style={styles.typeText}>Grupo</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </View>

      {/* Lista expandible de recogidas */}
      {isExpanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.sectionTitle}>Recogidas:</Text>
          {group.pickups.map((pickup, index) => (
            <View key={pickup.id} style={styles.pickupItem}>
              <View style={styles.pickupInfo}>
                <View style={[styles.infoRow, { marginBottom: 4 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <MaterialIcons name="store" size={14} color={CustomColors.textLight} style={{ marginRight: 4 }} />
                    <Text style={styles.pickupText}>{pickup.enterprise}</Text>
                  </View>
                  <Text style={styles.pickupAmount}>RD$ {(pickup.fee + pickup.cost).toFixed(2)}</Text>
                </View>
                <View style={[styles.infoRow]}>
                  <FontAwesome name="map-marker" size={14} color={CustomColors.textLight} style={{ marginRight: 4 }} />
                  <Text style={styles.pickupAddress} numberOfLines={1}>
                    {pickup.origin?.nombre || pickup.deliveryAddress}
                  </Text>
                </View>
              </View>
            </View>
          ))}
          
          <View style={styles.deliveryDestination}>
            <Text style={styles.sectionTitle}>Destino:</Text>
            <View style={styles.pickupInfo}>
              <View style={[styles.infoRow]}>
                <FontAwesome name="map-marker" size={14} color={CustomColors.secondary} style={{ marginRight: 4 }} />
                <Text style={styles.deliveryAddress} numberOfLines={2}>
                  {group.delivery.deliveryAddress}
                </Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  itemContainer: {
    backgroundColor: CustomColors.backgroundDark,
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  groupContainer: {
    borderLeftWidth: 4,
    borderLeftColor: CustomColors.secondary,
  },
  groupHeader: {
    padding: 16,
  },
  expandButton: {
    marginBottom: 8,
  },
  deliveryInfoSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
    borderRadius: 8,
    padding: 12,
    position: 'relative',
  },
  nonClickableSection: {
    backgroundColor: 'rgba(255, 255, 255, 0.01)',
    opacity: 0.9,
  },
  clickIndicator: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -6 }],
  },
  contentContainer: {
    flex: 1,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  groupTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: CustomColors.textLight,
  },
  statusText: {
    fontSize: 14,
    color: CustomColors.textLight,
    fontWeight: '500',
  },
  typeIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  groupIndicator: {
    backgroundColor: CustomColors.secondary,
  },
  typeText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandedContent: {
    borderTopWidth: 1,
    borderTopColor: CustomColors.divider,
    padding: 16,
    paddingTop: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: CustomColors.secondary,
    marginBottom: 8,
  },
  pickupItem: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  pickupInfo: {
    flex: 1,
  },
  pickupText: {
    fontSize: 13,
    color: CustomColors.textLight,
    fontWeight: '500',
  },
  pickupAmount: {
    fontSize: 13,
    color: CustomColors.secondary,
    fontWeight: 'bold',
  },
  pickupAddress: {
    fontSize: 12,
    color: CustomColors.textLight,
    opacity: 0.8,
    flex: 1,
  },
  deliveryDestination: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  deliveryAddress: {
    fontSize: 13,
    color: CustomColors.secondary,
    fontWeight: '500',
    flex: 1,
  },
});