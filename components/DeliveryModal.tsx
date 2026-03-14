import React from "react";
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import DeliveryProductsList from '@/components/DeliveryProductsList';
import { AssignmentType } from "@/utils/enum";

interface DeliveryModalProps {
  visible: boolean;
  deliveries: DeliveryItemAdapter[];
  onClose: () => void;
  onProgressGroup?: (deliveries: DeliveryItemAdapter[]) => void;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({
  visible,
  deliveries,
  onClose,
  onProgressGroup,
}) => {
  if (deliveries.length === 0) return null;

  const type = deliveries[0].type;
  const isPickup = type === AssignmentType.PICKUP;
  const typeLabel = isPickup ? "RECOGIDA" : "ENTREGA";
  const typeColor = isPickup ? CustomColors.quaternary : CustomColors.secondary;

  const totalAmount = deliveries.reduce(
    (sum, d) => sum + (d.amountToBeCharged || 0) + (d.deliveryCost || 0),
    0,
  );

  // Group assignments by phone so the same entity is shown only once
  const phoneGroupsMap = deliveries.reduce<Record<string, DeliveryItemAdapter[]>>(
    (acc, d) => {
      const key = d.phone?.trim() || `id-${d.id}`;
      if (!acc[key]) acc[key] = [];
      acc[key].push(d);
      return acc;
    },
    {},
  );
  const phoneGroups = Object.values(phoneGroupsMap);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={styles.deliveryModal}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <View style={styles.headerLeft}>
              <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
                <Text style={styles.typeBadgeText}>{typeLabel}</Text>
              </View>
              {deliveries.length > 1 && (
                <Text style={styles.groupCount}>
                  {deliveries.length} asignaciones
                  {phoneGroups.length < deliveries.length
                    ? ` · ${phoneGroups.length} cliente${phoneGroups.length !== 1 ? "s" : ""}`
                    : ""}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* List of deliveries in this group */}
          <ScrollView style={styles.modalScrollContent}>
            {phoneGroups.map((group, index) => {
              const first = group[0];
              const groupTotal = group.reduce(
                (sum, d) => sum + (d.amountToBeCharged || 0) + (d.deliveryCost || 0),
                0,
              );
              const uniqueObservations = [
                ...new Set(group.map((d) => d.observations).filter(Boolean)),
              ];
              const allOrderDetails = group.flatMap(
                (d) => d.relatedOrder?.orderDetails ?? [],
              );

              return (
                <View
                  key={first.phone?.trim() || `group-${index}`}
                  style={[
                    styles.deliveryItem,
                    index < phoneGroups.length - 1 && styles.deliveryItemBorder,
                  ]}
                >
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Cliente:</Text>
                    <Text style={styles.infoItemValue}>
                      {first.client} ({first.phone})
                    </Text>
                  </View>

                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Dirección:</Text>
                    <Text style={styles.infoItemValue}>
                      {first.deliveryAddress}
                    </Text>
                  </View>

                  {!isPickup && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>
                        {group.length > 1
                          ? `Monto (${group.length} asig.):`
                          : "Monto:"}
                      </Text>
                      <Text style={styles.infoItemValue}>
                        RD$ {groupTotal}
                      </Text>
                    </View>
                  )}

                  {uniqueObservations.map((obs, i) => (
                    <View key={i} style={styles.infoItem}>
                      <Text style={styles.infoItemLabel}>Observaciones:</Text>
                      <Text style={styles.infoItemValue}>{obs}</Text>
                    </View>
                  ))}

                  {allOrderDetails.length > 0 && (
                    <DeliveryProductsList orderDetails={allOrderDetails} />
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer — group totals + action */}
          <View style={styles.modalFooter}>
            {!isPickup && deliveries.length > 1 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total del grupo:</Text>
                <Text style={styles.totalValue}>RD$ {totalAmount}</Text>
              </View>
            )}

            {onProgressGroup && (
              <TouchableOpacity
                style={[styles.progressButton, { backgroundColor: typeColor }]}
                onPress={() => {
                  onProgressGroup(deliveries);
                  onClose();
                }}
              >
                <Text style={styles.progressButtonText}>
                  Progresar {deliveries.length > 1 ? "Grupo" : typeLabel}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  deliveryModal: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 15,
    width: "95%",
    maxHeight: "80%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "20",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: "bold",
  },
  groupCount: {
    color: CustomColors.textLight,
    fontSize: 14,
    opacity: 0.7,
  },
  closeButton: {
    marginLeft: 10
  },
  closeButtonText: {
    color: CustomColors.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  modalScrollContent: {
    maxHeight: 500,
  },
  deliveryItem: {
    padding: 15,
  },
  deliveryItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "15",
  },
  infoItem: {
    marginBottom: 10,
  },
  infoItemLabel: {
    color: CustomColors.textLight,
    fontSize: 13,
    fontWeight: "bold",
    opacity: 0.6,
    marginBottom: 3,
  },
  infoItemValue: {
    color: CustomColors.textLight,
    fontSize: 15,
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: CustomColors.textLight + "20",
    gap: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
  },
  totalLabel: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: "bold",
    opacity: 0.8,
  },
  totalValue: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
  progressButton: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  progressButtonText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default DeliveryModal;
