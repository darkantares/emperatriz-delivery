import {
  StyleSheet,
  Dimensions,
  View,
  TouchableOpacity,
  Linking,
  Alert,
} from "react-native";
import { Text } from "@/components/Themed";
import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { CustomColors } from "@/constants/CustomColors";
import { AssignmentType } from "@/utils/enum";
import { IProvincia, IMunicipio, ISector } from "@/interfaces/location";
import { openWhatsAppMessage } from "@/utils/whatsapp";

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
  fee: number;
  cost: number;
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
  onAction,
}) => {
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

  const ContainerComponent = onPress ? TouchableOpacity : View;

  return (
    <ContainerComponent
      style={[styles.itemContainer, styles.deliveryContainer]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.contentContainer}>
        {/* Cliente y Teléfono en la misma fila */}
        <View style={[styles.infoRow, { justifyContent: "space-between" }]}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <FontAwesome
              name="user"
              size={16}
              color={CustomColors.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.statusText}>{item.client}</Text>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: 18 }}>
            {/* Icono de Llamada */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() => handleCall(item.phone)}
              activeOpacity={0.7}
              accessibilityLabel="Llamar por teléfono"
            >
              <FontAwesome
                name="phone"
                size={40}
                color={CustomColors.textLight}
                style={{ marginRight: 6 }}
              />
            </TouchableOpacity>

            {/* Icono de WhatsApp */}
            <TouchableOpacity
              style={{ flexDirection: "row", alignItems: "center" }}
              onPress={() =>
                openWhatsAppMessage(item.phone, `Hola ${item.client}`)
              }
              activeOpacity={0.7}
              accessibilityLabel="Enviar mensaje por WhatsApp"
            >
              <FontAwesome
                name="whatsapp"
                size={40}
                color={CustomColors.textLight}
              />
            </TouchableOpacity>
          </View>
          
          {onAction && (
            <ProgressIconButton onPress={onAction} />
          )}
        </View>

        {/* Monto solo si es DELIVERY, tipo y estado siempre */}
        <View style={[styles.infoRow, { justifyContent: "space-between" }]}>
          {/* Monto a cobrar solo si es DELIVERY */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "flex-end",
            }}
          >
            <FontAwesome
              name="money"
              size={16}
              color={CustomColors.textLight}
              style={{ marginRight: 6 }}
            />
            <Text style={styles.statusText}>
              RD$ {((item.fee || 0) + (item.cost || 0)).toFixed(2)}
            </Text>
          </View>
          {/* Tipo y estado */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
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
            {/* Tag GRUPO si pertenece a un grupo */}
            {item.isGroup && (
              <View style={[styles.typeIndicator, styles.groupIndicator]}>
                <Text style={styles.typeText}>GRUPO</Text>
              </View>
            )}
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
  numberContainer: {
    width: 30,
    height: 30,
    borderRadius: 20,
    backgroundColor: CustomColors.backgroundDark,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  numberText: {
    color: CustomColors.secondary,
    fontSize: 16,
    fontWeight: "bold",
  },
  contentContainer: {
    flex: 1,
    position: "relative",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: "bold",
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
    fontSize: 16,
    fontWeight: "bold",
  },
  statusText: {
    fontSize: 14,
    fontWeight: "bold",
    marginLeft: 2,
  },
  clickIndicator: {
    position: "absolute",
    right: 12,
    top: "50%",
    transform: [{ translateY: -6 }],
  },
});
