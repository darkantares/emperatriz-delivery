import {
  StyleSheet,
  View,
  TouchableOpacity,
} from "react-native";
import { Text } from "@/components/Themed";
import { FontAwesome } from "@expo/vector-icons";
import React from "react";
import { CustomColors } from "@/constants/CustomColors";
import { AssignmentType } from "@/utils/enum";
import { IProvincia, IMunicipio, ISector } from "@/interfaces/location";
import { IDeliveryStatusEntity } from "@/interfaces/delivery/delivery";
import { ProgressIconButton } from '@/components/ProgressIconButton';

export interface Item {
  id: string;
  title: string;
  client: string;
  phone: string;
  type: AssignmentType;
  deliveryAddress: string;
  provincia: IProvincia;
  municipio: IMunicipio;
  origin?: ISector;
  destiny?: ISector;
  deliveryStatus: IDeliveryStatusEntity;
  deliveryCost: number;
  amountToBeCharged: number;
  enterprise: string;
  isGroup?: boolean;
  shipmentId?: string;
}

interface DeliveryItemProps {
  item: Item;
  onPress?: () => void;
  onAction?: () => void;
}

export const DeliveryItem: React.FC<DeliveryItemProps> = ({
  item,
  onPress,
}) => {
  const ContainerComponent = onPress ? TouchableOpacity : View;

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
          <View style={styles.clientRow}>
            <FontAwesome
              name="user"
              size={16}
              color={CustomColors.textLight}
              style={styles.icon}
            />
            <Text style={styles.statusText} numberOfLines={1}>
              {item.client}
            </Text>
          </View>

          <View style={styles.typeBadgeContainer}>
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
    position: "relative",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  icon: {
    marginRight: 6,
  },
  typeBadgeContainer: {
    alignItems: "flex-end",
    marginRight: 10,
  },
  typeIndicator: {
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
    fontSize: 16,
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 2,
  },
});
