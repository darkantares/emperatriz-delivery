import {
  StyleSheet,
  View,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Text } from "@/components/Themed";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { CustomColors } from "@/constants/CustomColors";
import { AssignmentType } from "@/utils/enum";
import { openWhatsAppMessage } from "@/utils/whatsapp";

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
  onPress?: () => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({
  item,
  onPress,
}) => {
  const ContainerComponent = onPress ? TouchableOpacity : View;

  const handleWhatsApp = async () => {
    if (!item.phone) return;
    const success = await openWhatsAppMessage(item.phone);
    if (!success) Alert.alert("WhatsApp", "No se pudo abrir WhatsApp.");
  };

  const handleCall = () => {
    if (!item.phone) return;
    Linking.openURL(`tel:${item.phone}`);
  };

  return (
    <ContainerComponent
      style={[
        styles.itemContainer,
        item.type === AssignmentType.PICKUP
          ? styles.pickupContainer
          : styles.deliveryContainer,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.contentContainer}>
        <View style={styles.row}>
          {/* Columna izquierda: cliente + tipo */}
          <View style={styles.infoColumn}>
            <Text style={styles.clientText} numberOfLines={1}>
              {item.client}
            </Text>
            <Text style={styles.addressText}>
              Dirección: {item.deliveryAddress}
            </Text>
            <View
              style={[
                styles.typeIndicator,
                item.type === AssignmentType.PICKUP
                  ? styles.pickupIndicator
                  : styles.deliveryIndicator,
              ]}
            >
              <Text style={styles.typeText}>
                {item.type === AssignmentType.PICKUP ? "Recogida" : "Entrega"}
              </Text>
            </View>
          </View>

          {/* Columna derecha: botones */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleWhatsApp}
              activeOpacity={0.7}
            >
              <FontAwesome name="whatsapp" size={20} color="#25D366" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCall}
              activeOpacity={0.7}
            >
              <FontAwesome name="phone" size={18} color={CustomColors.secondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </ContainerComponent>
  );
};

const styles = StyleSheet.create({
  itemContainer: {
    padding: 16,
    borderRadius: 18,
    marginHorizontal: 14,
    marginBottom: 10,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    // Sombra sutil para destacar la tarjeta
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
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
  contentContainer: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  infoColumn: {
    flex: 1,
    gap: 6,
  },
  clientText: {
    fontSize: 15,
    fontWeight: "bold",
    color: CustomColors.textLight,
  },
  typeIndicator: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pickupIndicator: {
    backgroundColor: CustomColors.quaternary,
  },
  deliveryIndicator: {
    backgroundColor: CustomColors.secondary,
  },
  typeText: {
    color: CustomColors.textLight,
    fontSize: 13,
    fontWeight: "bold",
  },
  addressText: {
    color: CustomColors.textLight,
    fontSize: 12,
    marginTop: 4,
    opacity: 0.8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginLeft: 10,
  },
  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: CustomColors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: CustomColors.secondary,
  },
});
