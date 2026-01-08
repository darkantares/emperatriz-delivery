import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { AppHeader } from "@/components/header/AppHeader";
import * as ImagePicker from "expo-image-picker";
import {
  getStatusColor,
  IDeliveryStatus,
  getStatusIdFromTitle,
} from "@/interfaces/delivery/deliveryStatus";
import { CustomColors } from "@/constants/CustomColors";
import { deliveryService } from "@/services/deliveryService";
import {
  IDeliveryStatusEntity,
  IUpdateDeliveryStatusData,
} from "@/interfaces/delivery/delivery";
import { useDelivery } from "@/context/DeliveryContext";
import { AssignmentType } from "@/utils/enum";
import { EvidenceSection } from "@/components/status-update/EvidenceSection";
import { NoteInput } from "@/components/status-update/NoteInput";
import { PaymentControls } from "@/components/status-update/PaymentControls";
import { StatusList } from "@/components/status-update/StatusList";
import { useEvidenceFlags } from "@/hooks/useEvidenceFlags";
import { usePaymentMethods } from "@/hooks/usePaymentMethods";
import { useStatusData } from "@/hooks/useStatusData";
import { Capitalize } from "@/utils/capitalize";

export default function StatusUpdateScreen() {
  const params = useLocalSearchParams<{
    itemId: string;
    itemTitle: string;
    currentStatus: string;
    totalAmmount: string;
  }>();

  const itemId = String(params.itemId || "");
  const itemTitle = String(params.itemTitle || "");
  const currentStatus = String(params.currentStatus || "");
  const totalAmmount = parseFloat(String(params.totalAmmount || "0")) || 0;

  const { fetchDeliveries, deliveries, inProgressDelivery } = useDelivery();
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { availableStatuses, loadingStatuses } = useStatusData(currentStatus);
  const [loading, setLoading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [amountPaidEdited, setAmountPaidEdited] = useState<boolean>(false);
  const [additionalAmount, setAdditionalAmount] = useState<string>("");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    number | null
  >(null);
  const { paymentMethods } = usePaymentMethods();
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] =
    useState<boolean>(false);

  const statusesRequiringNote = [
    IDeliveryStatus.CANCELLED,
    IDeliveryStatus.RETURNED,
    IDeliveryStatus.ON_HOLD,
    IDeliveryStatus.SCHEDULED,
  ];

  const currentDelivery = (() => {
    const found = deliveries.find((d) => d.id === itemId);
    if (found) return found;
    if (inProgressDelivery && inProgressDelivery.id === itemId)
      return inProgressDelivery;
    return undefined;
  })();
  const isPickupType = currentDelivery?.type === AssignmentType.PICKUP;
  const isDelivered = selectedStatus === IDeliveryStatus.DELIVERED;
  const requiresNote =
    selectedStatus &&
    statusesRequiringNote.includes(selectedStatus as IDeliveryStatus);

  const requiresPaymentInfo =
    isDelivered && !isPickupType;

  const selectedPaymentTitle: string | null = selectedPaymentMethod
    ? (paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.title?.toLowerCase() ?? null)
    : null;
  const isPaymentMethodDisabled = totalAmmount === 0 && isDelivered && !isPickupType;
  const {
    requiresCameraPhoto,
    requiresGalleryImage,
    showEvidence,
  } = useEvidenceFlags(selectedStatus, isPickupType, selectedPaymentTitle, amountPaid);

  useEffect(() => {
    if (isPickupType && isDelivered) {
      setAmountPaid("0");
    }
  }, [isPickupType, selectedStatus]);

  useEffect(() => {
    if (
      isDelivered &&
      !isPickupType &&
      !amountPaidEdited
    ) {
      setAmountPaid(totalAmmount.toFixed(2));
      if (totalAmmount === 0) {
        const transferencia = paymentMethods.find(pm => pm.title?.toLowerCase() === 'transferencia');
        if (transferencia) {
          setSelectedPaymentMethod(transferencia.id);
        }
      }
    }
  }, [selectedStatus, isPickupType, totalAmmount, amountPaidEdited, paymentMethods]);

  const isFormValid =
    selectedStatus &&
    availableStatuses.length > 0 &&
    (!requiresNote || note.trim() !== "") &&
    (!requiresCameraPhoto || photoUri) &&
    (!requiresGalleryImage || imageUri) &&
    (!requiresPaymentInfo || (amountPaid.trim() !== "" && selectedPaymentMethod));

  useEffect(() => {
    setSelectedStatus(null);
    setNote("");
    setPhotoUri(null);
    setImageUri(null);
    setAmountPaid("");
    setAdditionalAmount("");
    setSelectedPaymentMethod(null);
    setAmountPaidEdited(false);
  }, [currentStatus]);

  const takePhoto = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestCameraPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permiso denegado",
          "Se requiere permiso de cámara para tomar la foto de evidencia.",
          [{ text: "OK" }]
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert("Error", "No se pudo tomar la foto. Inténtalo de nuevo.", [
        { text: "OK" },
      ]);
    }
  };

  const selectImageFromGallery = async () => {
    try {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (permissionResult.granted === false) {
        Alert.alert(
          "Permiso denegado",
          "Se requiere permiso para acceder a la galería de imágenes.",
          [{ text: "OK" }]
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: "images",
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch {
      Alert.alert(
        "Error",
        "No se pudo seleccionar la imagen. Inténtalo de nuevo.",
        [{ text: "OK" }]
      );
    }
  };

  const removePhoto = () => {
    setPhotoUri(null);
  };
  const removeImage = () => {
    setImageUri(null);
  };

  const handleClose = () => {
    router.back();
    setLoading(false);
  };

  const handleConfirm = async () => {
    if (selectedStatus) {
      if (requiresNote && note.trim() === "") {
        Alert.alert(
          "Campo requerido",
          "Debes escribir una nota para este estado.",
          [{ text: "OK" }]
        );
        return;
      }

      if (!isPickupType && isDelivered && (!photoUri && !imageUri)) {
        Alert.alert(
          "Evidencia requerida",
          "Debes tomar una foto o seleccionar una imagen para el estado DELIVERED.",
          [{ text: "OK" }]
        );
        return;
      }

      if (requiresPaymentInfo) {
        if (!amountPaid.trim()) {
          Alert.alert(
            "Monto requerido",
            "Debes ingresar el monto pagado para el estado DELIVERED.",
            [{ text: "OK" }]
          );
          return;
        }
        if (!selectedPaymentMethod) {
          Alert.alert(
            "Método de pago requerido",
            "Debes seleccionar un método de pago para el estado DELIVERED.",
            [{ text: "OK" }]
          );
          return;
        }
      }

      const statusId = getStatusIdFromTitle(selectedStatus);
      if (!statusId) {
        Alert.alert("Error", "No se pudo obtener el ID del estado seleccionado.", [
          { text: "OK" },
        ]);
        return;
      }

      setLoading(true);
      try {
        let result;
        const evidenceUris: string[] = [];
        if (photoUri) evidenceUris.push(photoUri);
        if (imageUri) evidenceUris.push(imageUri);

        if (requiresCameraPhoto && !photoUri) {
          Alert.alert("Evidencia requerida", "Debes tomar una foto con la cámara.", [
            { text: "OK" },
          ]);
          return;
        }
        if (requiresGalleryImage && !imageUri) {
          Alert.alert(
            "Evidencia requerida",
            "Debes seleccionar una imagen de galería para pagos por transferencia.",
            [{ text: "OK" }]
          );
          return;
        }

        if (evidenceUris.length > 0) {
          const updateData: IUpdateDeliveryStatusData = {
            id: itemId,
            status: statusId,
            note: requiresNote ? note.trim() : undefined,
            imageUris: evidenceUris,
            amountPaid:
              requiresPaymentInfo && amountPaid.trim()
                ? parseFloat(amountPaid)
                : undefined,
            additionalAmount:
              isPickupType && isDelivered && additionalAmount.trim()
                ? parseFloat(additionalAmount)
                : undefined,
            paymentMethodId:
              requiresPaymentInfo && selectedPaymentMethod
                ? selectedPaymentMethod
                : undefined,
          };
          result = await deliveryService.updateDeliveryStatusWithImages(updateData);
          console.log('updateData:', updateData);
          
        } else {
          result = await deliveryService.updateDeliveryStatus(
            itemId,
            statusId,
            requiresNote ? note.trim() : undefined,
            requiresPaymentInfo && amountPaid.trim()
              ? parseFloat(amountPaid)
              : undefined,
            requiresPaymentInfo && selectedPaymentMethod
              ? selectedPaymentMethod
              : undefined,
            isPickupType && isDelivered && additionalAmount.trim()
              ? parseFloat(additionalAmount)
              : undefined
          );
        }

        if (result.success) {
          await fetchDeliveries();
          router.back();
        } else {
          Alert.alert("Error", `No se pudo actualizar el estado: ${result.error}`, [
            { text: "OK" },
          ]);
        }
      } catch (error) {
        Alert.alert(
          "Error",
          `Ocurrió un error inesperado: ${
            error instanceof Error ? error.message : "Error desconocido"
          }`,
          [{ text: "OK" }]
        );
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
      <AppHeader />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.modalContent}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Actualizar Estado</Text>
          <Text style={styles.deliveryTitle}>Cliente: {itemTitle}</Text>
          {!isPickupType && (
            <Text style={styles.deliveryTitle}>
              Total: ${totalAmmount.toFixed(2)}
            </Text>
          )}
          <Text style={styles.currentStatus}>
            Estado actual:{" "}
            <Text
              style={[styles.statusValue, { color: getStatusColor(currentStatus) }]}
            >
              {Capitalize(currentStatus)}
            </Text>
          </Text>
        </View>

        <StatusList
          availableStatuses={availableStatuses as any}
          selectedStatus={selectedStatus}
          onSelectStatus={setSelectedStatus}
          loadingStatuses={loadingStatuses}
          styles={styles}
        />

        {requiresNote && <NoteInput value={note} onChange={setNote} styles={styles} />}

        {isDelivered && !isPickupType && (
          <PaymentControls
            selectedPaymentMethod={selectedPaymentMethod}
            paymentMethods={paymentMethods}
            showPicker={showPaymentMethodPicker}
            setShowPicker={setShowPaymentMethodPicker}
            onSelect={setSelectedPaymentMethod}
            styles={styles}
            disabled={isPaymentMethodDisabled}
          />
        )}
        
        <EvidenceSection
          showEvidence={showEvidence}
          requiresCameraPhoto={requiresCameraPhoto}
          requiresGalleryImage={requiresGalleryImage}
          photoUri={photoUri}
          imageUri={imageUri}
          takePhoto={takePhoto}
          selectImageFromGallery={selectImageFromGallery}
          removePhoto={removePhoto}
          removeImage={removeImage}
          styles={styles}
        />

        {selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType && (
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentLabel}>Monto Pagado (Obligatorio):</Text>
            <TextInput
              style={styles.paymentInput}
              placeholder="Ingrese el monto pagado..."
              placeholderTextColor={CustomColors.divider}
              value={amountPaid}
              editable={false}
              selectTextOnFocus={false}
            />
          </View>
        )}

        {selectedStatus === IDeliveryStatus.DELIVERED && isPickupType && (
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentLabel}>Monto Adicional (Opcional):</Text>
            <TextInput
              style={styles.paymentInput}
              placeholder="Ingrese el monto adicional..."
              placeholderTextColor={CustomColors.divider}
              value={additionalAmount}
              onChangeText={setAdditionalAmount}
              keyboardType="numeric"
            />
          </View>
        )}

        <View style={styles.buttonContainer}>
          <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleClose}>
            <Text style={styles.buttonText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.confirmButton, !isFormValid && styles.disabledButton]}
            onPress={handleConfirm}
            disabled={!isFormValid || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Confirmar</Text>
            )}
          </TouchableOpacity>
        </View>
        </View>
      </ScrollView>

      
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: CustomColors.backgroundDark,
    borderRadius: 10,
    padding: 20,
    width: "100%",
  },
  modalHeader: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: CustomColors.textLight,
    marginBottom: 10,
    textAlign: "center",
  },
  deliveryTitle: {
    fontSize: 16,
    color: CustomColors.textLight,
    textAlign: "center",
    marginBottom: 5,
  },
  currentStatus: {
    fontSize: 16,
    color: CustomColors.textLight,
    textAlign: "center",
    marginBottom: 5,
  },
  statusValue: {
    fontWeight: "bold",
  },
  statusList: {
    marginBottom: 20,
  },
  statusItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: CustomColors.cardBackground,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CustomColors.divider,
  },
  skeletonItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: CustomColors.cardBackground,
    marginBottom: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: CustomColors.divider,
  },
  skeletonRadio: {
    height: 24,
    width: 24,
    borderRadius: 12,
    backgroundColor: CustomColors.divider,
    marginRight: 12,
  },
  skeletonText: {
    flex: 1,
    height: 16,
    borderRadius: 4,
    backgroundColor: CustomColors.divider,
  },
  skeletonIndicator: {
    height: 8,
    width: 40,
    borderRadius: 4,
    backgroundColor: CustomColors.divider,
    marginLeft: 12,
  },
  radioButton: {
    height: 24,
    width: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: CustomColors.textLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },
  radioButtonSelected: {
    height: 12,
    width: 12,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 16,
    color: CustomColors.textLight,
    flex: 1,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: 10,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: CustomColors.backgroundDarkest,
    marginRight: 10,
  },
  confirmButton: {
    backgroundColor: CustomColors.secondary,
    marginLeft: 10,
  },
  disabledButton: {
    backgroundColor: CustomColors.divider,
    opacity: 0.7,
  },
  buttonText: {
    color: CustomColors.textLight,
    fontWeight: "bold",
    fontSize: 16,
  },
  noStatusesContainer: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    marginBottom: 20,
  },
  noStatusesText: {
    color: CustomColors.textLight,
    textAlign: "center",
    fontSize: 16,
    opacity: 0.7,
  },
  noteContainer: {
    marginBottom: 20,
  },
  noteLabel: {
    fontSize: 16,
    color: CustomColors.textLight,
    marginBottom: 8,
    fontWeight: "bold",
  },
  noteInput: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    color: CustomColors.textLight,
    fontSize: 16,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    minHeight: 80,
    maxHeight: 120,
  },
  characterCount: {
    fontSize: 12,
    color: CustomColors.textLight,
    opacity: 0.6,
    textAlign: "right",
    marginTop: 4,
  },
  photoContainer: {
    marginBottom: 20,
  },
  photoLabel: {
    fontSize: 16,
    color: CustomColors.textLight,
    fontWeight: "bold",
    marginBottom: 5,
  },
  photoButton: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 5,
  },
  photoButtonText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: "bold",
  },
  imagesRowContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  imageHalfContainer: {
    flex: 0.48,
  },
  singleImageContainer: {},
  imageTypeLabel: {
    fontSize: 14,
    color: CustomColors.textLight,
    marginBottom: 5,
    fontWeight: "600",
  },
  photoPreviewContainer: {
    position: "relative",
    alignItems: "center",
  },
  photoPreview: {
    width: 150,
    height: 112,
    borderRadius: 8,
    resizeMode: "cover",
  },
  photoPreviewHalf: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    resizeMode: "cover",
  },
  removePhotoButton: {
    position: "absolute",
    top: 5,
    right: 5,
    backgroundColor: "rgba(255, 0, 0, 0.8)",
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  removePhotoText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  imagePlaceholderContainer: {
    alignItems: "center",
  },
  imagePlaceholder: {
    width: "100%",
    height: 100,
    borderRadius: 8,
    backgroundColor: CustomColors.backgroundDarkest,
    borderWidth: 2,
    borderColor: CustomColors.divider,
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  placeholderIcon: {
    fontSize: 24,
    color: CustomColors.textLight,
    opacity: 0.6,
    marginBottom: 4,
  },
  placeholderText: {
    fontSize: 12,
    color: CustomColors.textLight,
    opacity: 0.6,
    textAlign: "center",
  },
  placeholderButton: {
    backgroundColor: CustomColors.secondary,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    width: "100%",
    alignItems: "center",
  },
  placeholderButtonText: {
    color: CustomColors.textLight,
    fontSize: 12,
    fontWeight: "bold",
  },
  paymentContainer: {
    marginBottom: 10,
  },
  paymentLabel: {
    fontSize: 16,
    color: CustomColors.textLight,
    fontWeight: "bold",
  },
  paymentInput: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    color: CustomColors.textLight,
    fontSize: 16,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    height: 50,
  },
  paymentMethodButton: {
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: CustomColors.divider,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    height: 50,
  },
  paymentMethodButtonText: {
    color: CustomColors.textLight,
    fontSize: 16,
    flex: 1,
  },
  dropdownArrow: {
    color: CustomColors.textLight,
    fontSize: 12,
  },
  pickupNoteContainer: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
  },
  pickupNoteText: {
    color: CustomColors.textLight,
    fontSize: 14,
    opacity: 0.9,
  },
});
