import React from "react";
import { View, Text, TouchableOpacity, Modal } from "react-native";
import { CustomColors } from "@/constants/CustomColors";
import { IPaymentMethodEntity } from "@/interfaces/payment/payment";

type Props = {
  selectedPaymentMethod: number | null;
  paymentMethods: IPaymentMethodEntity[];
  showPicker: boolean;
  setShowPicker: (v: boolean) => void;
  onSelect: (id: number) => void;
  styles: any;
};

export function PaymentControls({
  selectedPaymentMethod,
  paymentMethods,
  showPicker,
  setShowPicker,
  onSelect,
  styles,
}: Props) {
  return (
    <>
      <View style={styles.paymentContainer}>
        <Text style={styles.paymentLabel}>Método de Pago (Obligatorio):</Text>
        <TouchableOpacity
          style={styles.paymentMethodButton}
          onPress={() => setShowPicker(true)}
        >
          <Text style={styles.paymentMethodButtonText}>
            {selectedPaymentMethod
              ? paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.title
              : "Seleccionar método de pago..."}
          </Text>
          <Text style={styles.dropdownArrow}>▼</Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "60%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Método de Pago</Text>
            <View>
              {paymentMethods.map((item) => (
                <TouchableOpacity
                  key={item.id.toString()}
                  style={[
                    styles.statusItem,
                    selectedPaymentMethod === item.id && {
                      borderColor: CustomColors.secondary,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    onSelect(item.id);
                    setShowPicker(false);
                  }}
                >
                  <View
                    style={[
                      styles.radioButton,
                      selectedPaymentMethod === item.id && {
                        borderColor: CustomColors.secondary,
                      },
                    ]}
                  >
                    {selectedPaymentMethod === item.id && (
                      <View
                        style={[
                          styles.radioButtonSelected,
                          { backgroundColor: CustomColors.secondary },
                        ]}
                      />
                    )}
                  </View>
                  <Text
                    style={[
                      styles.statusText,
                      {
                        color:
                          selectedPaymentMethod === item.id
                            ? CustomColors.secondary
                            : CustomColors.textLight,
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { width: "100%", marginTop: 10 }]}
              onPress={() => setShowPicker(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}
