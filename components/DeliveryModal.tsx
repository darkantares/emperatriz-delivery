import React, { useEffect, useState } from "react";
import { View, StyleSheet, Modal, TouchableOpacity, ScrollView } from "react-native";
import { Text } from "@/components/Themed";
import { CustomColors } from "@/constants/CustomColors";
import { DeliveryItemAdapter } from "@/interfaces/delivery/deliveryAdapters";
import DeliveryProductsList from '@/components/DeliveryProductsList';
import { AssignmentType } from "@/utils/enum";
import { Capitalize } from "@/utils/capitalize";

interface DeliveryModalProps {
  visible: boolean;
  deliveries: DeliveryItemAdapter[];
  onClose: () => void;
  onProgressDelivery?: (delivery: DeliveryItemAdapter) => void;
}

const DeliveryModal: React.FC<DeliveryModalProps> = ({
  visible,
  deliveries,
  onClose,
  onProgressDelivery,
}) => {
  const [activeTabIndex, setActiveTabIndex] = useState<number>(0);

  useEffect(() => {
    // Reset active tab when deliveries change or modal is opened
    setActiveTabIndex(0);
  }, [deliveries, visible]);

  const current = deliveries[activeTabIndex];

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
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {deliveries.length > 1
                ? `Entregas en este punto (${deliveries.length})`
                : "Información de Entrega"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {deliveries.length > 1 && (
            <ScrollView
              horizontal
              style={styles.tabsContainer}
              showsHorizontalScrollIndicator={false}
            >
              {deliveries.map((delivery, index) => (
                <TouchableOpacity
                  key={delivery.id}
                  style={[styles.tab, activeTabIndex === index && styles.activeTab]}
                  onPress={() => setActiveTabIndex(index)}
                >
                  <Text style={[styles.tabText, activeTabIndex === index && styles.activeTabText]}>
                    Asignacion {index + 1}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          <ScrollView style={styles.modalScrollContent}>
            {current && (
              <View style={styles.modalContent}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoItemLabel}>Cliente:</Text>
                  <Text style={styles.infoItemValue}>{current.client} ({current.phone})</Text>
                </View>

                <View style={styles.infoItem}>
                  <Text style={styles.infoItemLabel}>Ubicación:</Text>
                  <Text style={styles.infoItemValue}>
                    {current.title}
                    {"\n"}
                    {"\n"}
                    {current.deliveryAddress}
                  </Text>
                </View>

                <View style={[styles.infoItem, { flexDirection: 'row', alignItems: 'center' }]}>
                  <Text style={[styles.infoItemLabel, styles.infoLabelInline]}>Estado:</Text>
                  <Text style={[styles.infoItemValue, { flex: 1, flexWrap: 'wrap' }]}>
                    {Capitalize(current.deliveryStatus.title)}
                  </Text>
                </View>

                <View style={[styles.infoItem, { flexDirection: 'row' }]}> 
                  <Text style={[styles.infoItemLabel, styles.infoLabelInline]}>Tipo:</Text>
                  <View style={[
                    styles.typeIndicator,
                    current.type === AssignmentType.PICKUP
                      ? styles.pickupIndicator
                      : current.type === AssignmentType.DELIVERY
                      ? styles.deliveryIndicator
                      : styles.groupIndicator,
                    { alignSelf: 'flex-start' }
                  ]}>
                    <Text style={styles.typeText}>
                      {current.type === AssignmentType.PICKUP
                        ? 'RECOGIDA'
                        : current.type === AssignmentType.DELIVERY
                        ? 'ENTREGA'
                        : Capitalize(current.type)}
                    </Text>
                  </View>
                </View>

                {current.type === AssignmentType.DELIVERY && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Monto a cobrar:</Text>
                    <Text style={styles.infoItemValue}>
                      RD${" "}{(current.amountToBeCharged + current.deliveryCost).toFixed(2)}
                    </Text>
                  </View>
                )}

                {current.observations && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoItemLabel}>Observaciones:</Text>
                    <Text style={styles.infoItemValue}>{current.observations}</Text>
                  </View>
                )}

                {current.relatedOrder?.orderDetails && current.relatedOrder.orderDetails.length > 0 && (
                  <DeliveryProductsList orderDetails={current.relatedOrder.orderDetails} />
                )}

              </View>
            )}
          </ScrollView>

          {onProgressDelivery && current && (
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.progressButton}
                onPress={() => {
                  onProgressDelivery(current);
                  onClose();
                }}
              >
                <Text style={styles.progressButtonText}>Progresar Envío</Text>
              </TouchableOpacity>
            </View>
          )}

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
    width: "90%",
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
  modalTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: "bold",
  },
  closeButtonText: {
    color: CustomColors.primary,
    fontSize: 24,
    fontWeight: "bold",
  },
  tabsContainer: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + "20",
    backgroundColor: CustomColors.backgroundDarkest,
  },
  tab: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 5,
    borderBottomWidth: 3,
    borderBottomColor: "transparent",
  },
  activeTab: {
    borderBottomColor: CustomColors.primary,
  },
  tabText: {
    color: CustomColors.textLight + "80",
    fontSize: 14,
    fontWeight: "600",
  },
  activeTabText: {
    color: CustomColors.primary,
    fontWeight: "bold",
  },
  modalScrollContent: {
    maxHeight: 700,
    paddingBottom: 12,
  },
  modalContent: {
    padding: 15,
  },
  infoItem: {
    marginBottom: 15,
  },
  infoItemLabel: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 5,
    opacity: 0.7,
  },
  infoItemValue: {
    color: CustomColors.textLight,
    fontSize: 16,
    flex: 1,
    flexWrap: 'wrap',
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
  infoLabelInline: {
    width: 60,
  },
  modalFooter: {
    padding: 15,
    borderTopWidth: 1,
    borderTopColor: CustomColors.textLight + "20",
    backgroundColor: CustomColors.backgroundDark,
  },
  progressButton: {
    backgroundColor: CustomColors.secondary,
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
