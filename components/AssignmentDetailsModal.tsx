import React from "react";
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Alert,
  Text,
  ScrollView,
  Image,
} from "react-native";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import { AssignmentType } from "@/utils/enum";
import { CustomColors } from "@/constants/CustomColors";
import { Capitalize } from "@/utils/capitalize";
import { openWhatsAppMessage } from "@/utils/whatsapp";

export interface AssignmentDetailsModalProps {
  visible: boolean;
  onClose: () => void;
  assignment: DeliveryItemAdapter;
}

export default function AssignmentDetailsModal({
  visible,
  onClose,
  assignment,
}: AssignmentDetailsModalProps) {
  const handleWhatsApp = async () => {
    if (!assignment.phone) return;
    const success = await openWhatsAppMessage(assignment.phone);
    if (!success) Alert.alert("WhatsApp", "No se pudo abrir WhatsApp.");
  };

  const handleCall = () => {
    if (!assignment.phone) return;
    Linking.openURL(`tel:${assignment.phone}`);
  };

  const provincia = Capitalize(assignment.provincia?.nombre || "");
  const municipio = Capitalize(assignment.municipio?.nombre || "");
  const sector = Capitalize(assignment.origin?.nombre || assignment.destiny?.nombre || "");
  const direccion = assignment.deliveryAddress || "";

  const fullAddress = `${provincia}${provincia ? ', ' : ''}${municipio}${municipio ? ', ' : ''}${sector}${sector ? ', ' : ''}${direccion}`.trim();
  const siteType = assignment.type === AssignmentType.PICKUP ? 'RECOGIDA' : 'ENTREGA';
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Detalle de ubicación</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            <View style={[styles.infoRow, { paddingVertical: 6, backgroundColor: '#2C2C2C', borderRadius: 10 }] }>
              <Text style={[styles.value, { color: '#FFD700', fontWeight: '800' }]}>{siteType}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Contacto:</Text>
              <Text style={styles.value}>{assignment.client}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Teléfono:</Text>
              <Text style={styles.value}>{assignment.phone || "Sin teléfono"}</Text>
            </View>
            <View style={[styles.infoRow, { justifyContent: 'flex-start', paddingVertical: 10 }] }>
              <Text style={[styles.value, { width: '100%', textAlign: 'left' }]}>{`${fullAddress || ''}`.trim() || 'Sin dirección'}</Text>
            </View>

            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={[styles.actionButton, styles.whatsappButton]}
                onPress={handleWhatsApp}
              >
                <Text style={styles.actionText}>WhatsApp</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.callButton]}
                onPress={handleCall}
              >
                <Text style={styles.actionText}>Llamar</Text>
              </TouchableOpacity>
            </View>

            {assignment.relatedOrder?.orderDetails &&
              assignment.relatedOrder.orderDetails.some(
                (detail) => detail.product?.files?.length > 0,
              ) && (
                <View style={styles.productsSection}>
                  <Text style={styles.productsSectionTitle}>Productos</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.productsScrollContent}
                  >
                    {assignment.relatedOrder.orderDetails
                      .filter((detail) => detail.product?.files?.length > 0)
                      .map((detail, idx) => {
                        const imageUrl = detail.product?.files?.[0]?.url;
                        return (
                          <View key={idx} style={styles.productItem}>
                            {imageUrl ? (
                              <Image
                                source={{ uri: imageUrl }}
                                style={styles.productImage}
                                resizeMode="cover"
                                defaultSource={require("@/assets/images/icon.png")}
                              />
                            ) : null}
                            {detail.productTitle ? (
                              <Text style={styles.productTitle} numberOfLines={2}>
                                {detail.productTitle}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                  </ScrollView>
                </View>
              )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },
  container: {
    width: "90%",
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: CustomColors.border,
    maxHeight: "85%",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: "700",
  },
  closeButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: CustomColors.error,
  },
  closeText: {
    color: CustomColors.textLight,
    fontWeight: "700",
  },
  content: {
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: CustomColors.backgroundMedium,
  },
  label: {
    color: CustomColors.neutralLight,
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  value: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
    flex: 1,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  whatsappButton: {
    backgroundColor: "#25D366",
  },
  callButton: {
    backgroundColor: CustomColors.secondary,
  },
  actionText: {
    color: CustomColors.textLight,
    fontWeight: "700",
  },
  productsSection: {
    borderTopWidth: 1,
    borderTopColor: CustomColors.border,
    paddingTop: 10,
  },
  productsSectionTitle: {
    color: CustomColors.neutralLight,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  productsScrollContent: {
    gap: 10,
    paddingHorizontal: 2,
    paddingBottom: 4,
  },
  productItem: {
    alignItems: "center",
    width: 72,
  },
  productImage: {
    width: 72,
    height: 72,
    borderRadius: 10,
    backgroundColor: CustomColors.backgroundMedium,
    overflow: "hidden",
  },
  productImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  productPlaceholderText: {
    fontSize: 28,
  },
  productTitle: {
    color: CustomColors.textLight,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
    width: 72,
  },
});
