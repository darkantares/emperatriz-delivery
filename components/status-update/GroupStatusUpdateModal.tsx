import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  Platform,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { IGpsReading } from "@/interfaces/delivery/delivery";
import {
  getStatusColor,
  IDeliveryStatus,
  getStatusIdFromTitle,
} from "@/interfaces/delivery/deliveryStatus";
import { CustomColors } from "@/constants/CustomColors";
import {
  updateDeliveryStatusBatch,
  updateDeliveryStatusUnified,
} from "@/core/actions/delivery.actions";
import { useDelivery } from "@/context/DeliveryContext";
import { AssignmentType } from "@/utils/enum";
import { EvidenceSection } from "@/components/status-update/EvidenceSection";
import { NoteInput } from "@/components/status-update/NoteInput";
import { PaymentControls } from "@/components/status-update/PaymentControls";
import { StatusList } from "@/components/status-update/StatusList";
import { useEvidenceFlags } from "@/core/hooks/useEvidenceFlags";
import { usePaymentMethods } from "@/core/hooks/usePaymentMethods";
import { useStatusData } from "@/core/hooks/useStatusData";
import { Capitalize } from "@/utils/capitalize";

export interface GroupStatusUpdateModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: (newStatus: string) => void;
  /** Numeric string IDs of every assignment in this group */
  ids: string[];
  assignmentType: AssignmentType;
  groupTitle: string;
  currentStatus: string;
  /** Sum of (deliveryCost + amountToBeCharged) across the group */
  totalAmount: number;
}

export default function GroupStatusUpdateModal({
  visible,
  onClose,
  onSuccess,
  ids,
  assignmentType,
  groupTitle,
  currentStatus,
  totalAmount,
}: GroupStatusUpdateModalProps) {
  const { fetchDeliveries, deliveries } = useDelivery();

  const isPickupType = assignmentType === AssignmentType.PICKUP;

  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const { availableStatuses, loadingStatuses } = useStatusData(currentStatus);
  const [loading, setLoading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [amountPaidEdited, setAmountPaidEdited] = useState<boolean>(false);
  const [additionalAmount, setAdditionalAmount] = useState<string>("");
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [codeVerificationStatus, setCodeVerificationStatus] = useState<
    "pending" | "valid" | "invalid"
  >("pending");
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [isCodeLocked, setIsCodeLocked] = useState<boolean>(false);
  const [lockTimeRemaining, setLockTimeRemaining] = useState<number>(0);
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

  const isDelivered = selectedStatus === IDeliveryStatus.DELIVERED;
  const requiresNote =
    selectedStatus &&
    statusesRequiringNote.includes(selectedStatus as IDeliveryStatus);
  const requiresPaymentInfo = isDelivered && !isPickupType;
  const requiresVerificationCode = isDelivered;

  const selectedPaymentTitle: string | null = selectedPaymentMethod
    ? (paymentMethods
        .find((pm) => pm.id === selectedPaymentMethod)
        ?.title?.toLowerCase() ?? null)
    : null;
  const isPaymentMethodDisabled =
    totalAmount === 0 && isDelivered && !isPickupType;

  const { requiresCameraPhoto, requiresGalleryImage, showEvidence } =
    useEvidenceFlags(
      selectedStatus,
      isPickupType,
      selectedPaymentTitle,
      amountPaid,
    );

  useEffect(() => {
    if (isPickupType && isDelivered) {
      setAmountPaid("0");
    }
  }, [isPickupType, selectedStatus]);

  useEffect(() => {
    if (isDelivered && !isPickupType && !amountPaidEdited) {
      setAmountPaid(String(totalAmount));
      if (totalAmount === 0) {
        const transferencia = paymentMethods.find(
          (pm) => pm.title?.toLowerCase() === "transferencia",
        );
        if (transferencia) setSelectedPaymentMethod(transferencia.id);
      }
    }
  }, [selectedStatus, isPickupType, totalAmount, amountPaidEdited, paymentMethods]);

  const isFormValid =
    selectedStatus &&
    availableStatuses.length > 0 &&
    (!requiresNote || note.trim() !== "") &&
    (!requiresCameraPhoto || photoUri) &&
    (!requiresGalleryImage || imageUri) &&
    (!requiresPaymentInfo ||
      (amountPaid.trim() !== "" && selectedPaymentMethod)) &&
    (!requiresVerificationCode ||
      (verificationCode.trim().length === 4 && codeVerificationStatus === "valid"));

  useEffect(() => {
    setSelectedStatus(null);
    setNote("");
    setPhotoUri(null);
    setImageUri(null);
    setAmountPaid("");
    setAdditionalAmount("");
    setSelectedPaymentMethod(null);
    setAmountPaidEdited(false);
    setVerificationCode("");
    setCodeVerificationStatus("pending");
    setFailedAttempts(0);
    setIsCodeLocked(false);
    setLockTimeRemaining(0);
  }, [currentStatus]);

  const assignmentVerificationCode = deliveries
    .find((delivery) => ids.includes(delivery.id))
    ?.deliveryVerificationCode;

  // Validar código en tiempo real contra el del assignment
  useEffect(() => {
    if (isDelivered && verificationCode.length === 4) {
      if (verificationCode === assignmentVerificationCode) {
        setCodeVerificationStatus("valid");
      } else {
        setCodeVerificationStatus("invalid");
      }
    } else if (verificationCode.length === 0) {
      setCodeVerificationStatus("pending");
    }
  }, [verificationCode, isDelivered, assignmentVerificationCode]);

  // Manejar contador de intentos fallidos
  useEffect(() => {
    if (codeVerificationStatus === "invalid" && verificationCode.length === 4) {
      const newAttempts = failedAttempts + 1;
      setFailedAttempts(newAttempts);

      if (newAttempts >= 3) {
        setIsCodeLocked(true);
        setLockTimeRemaining(15);
      }
    }
  }, [codeVerificationStatus]);

  // Timeout de 30 segundos después de 3 intentos fallidos
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    if (isCodeLocked && lockTimeRemaining > 0) {
      timer = setTimeout(() => {
        setLockTimeRemaining(lockTimeRemaining - 1);
      }, 1000);
    } else if (isCodeLocked && lockTimeRemaining === 0) {
      setIsCodeLocked(false);
      setFailedAttempts(0);
      setVerificationCode("");
      setCodeVerificationStatus("pending");
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isCodeLocked, lockTimeRemaining]);

  const takePhoto = async () => {
    const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso denegado", "Se requiere permiso de cámara.", [{ text: "OK" }]);
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setPhotoUri(result.assets[0].uri);
  };

  const selectImageFromGallery = async () => {
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso denegado", "Se requiere acceso a la galería.", [{ text: "OK" }]);
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: "images",
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) setImageUri(result.assets[0].uri);
  };

  const removePhoto = () => setPhotoUri(null);
  const removeImage = () => setImageUri(null);

  const handleClose = () => {
    setLoading(false);
    onClose();
  };

  const handleConfirm = async () => {
    if (!selectedStatus) return;

    if (requiresNote && note.trim() === "") {
      Alert.alert("Campo requerido", "Debes escribir una nota para este estado.", [{ text: "OK" }]);
      return;
    }
    if (!isPickupType && isDelivered && !photoUri && !imageUri) {
      Alert.alert("Evidencia requerida", "Debes tomar o seleccionar una foto.", [{ text: "OK" }]);
      return;
    }
    if (requiresPaymentInfo && !amountPaid.trim()) {
      Alert.alert("Monto requerido", "Debes ingresar el monto pagado.", [{ text: "OK" }]);
      return;
    }
    if (requiresPaymentInfo && !selectedPaymentMethod) {
      Alert.alert("Método de pago requerido", "Debes seleccionar un método de pago.", [{ text: "OK" }]);
      return;
    }
    if (requiresVerificationCode && verificationCode.trim().length !== 4) {
      Alert.alert(
        "Código requerido",
        "Debes ingresar el código de verificación de 4 dígitos para confirmar la entrega.",
        [{ text: "OK" }],
      );
      return;
    }
    if (requiresCameraPhoto && !photoUri) {
      Alert.alert("Evidencia requerida", "Debes tomar una foto con la cámara.", [{ text: "OK" }]);
      return;
    }
    if (requiresGalleryImage && !imageUri) {
      Alert.alert("Evidencia requerida", "Debes seleccionar una imagen de galería.", [{ text: "OK" }]);
      return;
    }

    const statusId = getStatusIdFromTitle(selectedStatus);
    if (!statusId) {
      Alert.alert("Error", "No se pudo obtener el ID del estado.", [{ text: "OK" }]);
      return;
    }

    setLoading(true);
    try {
      const STATUSES_REQUIRING_GPS = [
        IDeliveryStatus.IN_PROGRESS,
        IDeliveryStatus.DELIVERED,
        IDeliveryStatus.RETURNED,
      ];
      let gpsReadings: IGpsReading[] | undefined;
      if (STATUSES_REQUIRING_GPS.includes(selectedStatus as IDeliveryStatus)) {
        const { status: locStatus } =
          await Location.requestForegroundPermissionsAsync();
        if (locStatus === "granted") {
          const position = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.High,
          });
          gpsReadings = [
            {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy ?? 0,
              timestamp: position.timestamp,
              speed: position.coords.speed ?? undefined,
            },
          ];
        }
      }

      const evidenceUris: string[] = [];
      if (photoUri) evidenceUris.push(photoUri);
      if (imageUri) evidenceUris.push(imageUri);

      const commonNote = requiresNote ? note.trim() : undefined;
      const commonAmountPaid =
        requiresPaymentInfo && amountPaid.trim() ? parseFloat(amountPaid) : undefined;
      const commonPaymentMethodId =
        requiresPaymentInfo && selectedPaymentMethod ? selectedPaymentMethod : undefined;
      const commonAdditionalAmount =
        isPickupType && isDelivered && additionalAmount.trim()
          ? parseFloat(additionalAmount)
          : undefined;
      const commonImageUris = evidenceUris.length > 0 ? evidenceUris : undefined;
      const commonVerificationCode = requiresVerificationCode && verificationCode.trim()
        ? verificationCode.trim()
        : undefined;

      if (ids.length === 1) {
        console.log('there is 1 id, calling updateDeliveryStatusUnified')
        await updateDeliveryStatusUnified({
          id: ids[0],
          status: statusId,
          note: commonNote,
          amountPaid: commonAmountPaid,
          paymentMethodId: commonPaymentMethodId,
          additionalAmount: commonAdditionalAmount,
          gpsReadings,
          imageUris: commonImageUris,
          verificationCode: commonVerificationCode,
        });
      } else {
        console.log('there isnt ids');        
        const numericIds = ids.map((id) => Number(id));
        await updateDeliveryStatusBatch(
          numericIds,
          statusId,
          commonNote,
          commonAmountPaid,
          commonPaymentMethodId,
          commonAdditionalAmount,
          gpsReadings,
          commonImageUris,
          commonVerificationCode,
        );
      }

      await fetchDeliveries();
      setVerificationCode("");
      setCodeVerificationStatus("pending");
      setFailedAttempts(0);
      setIsCodeLocked(false);
      setLockTimeRemaining(0);
      onSuccess?.(selectedStatus);
      onClose();
    } catch (error:any) {
      Alert.alert(
        "Error",
        `Ocurrio un error: ${error instanceof Error ? error.message : "Error desconocido"}`,
        [{ text: "OK" }],
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Actualizar Estado</Text>
            <Text style={styles.deliveryTitle}>
              {groupTitle} · asignación{ids.length !== 1 ? "es" : ""} {ids.length} 
              {!isPickupType ? ` · Total: RD$ ${totalAmount}` : ""}
            </Text>
            <Text style={styles.currentStatus}>
              Estado actual:{" "}
              <Text
                style={[
                  styles.statusValue,
                  { color: getStatusColor(currentStatus) },
                ]}
              >
                {Capitalize(currentStatus)}
              </Text>
            </Text>
          </View>

          <ScrollView style={styles.scrollContent}>
            <StatusList
              availableStatuses={availableStatuses as any}
              selectedStatus={selectedStatus}
              onSelectStatus={setSelectedStatus}
              loadingStatuses={loadingStatuses}
              styles={styles}
            />

            {requiresNote && (
              <NoteInput value={note} onChange={setNote} styles={styles} />
            )}

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

            {isDelivered && !isPickupType && (
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

            {isDelivered && isPickupType && (
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

            {isDelivered && (
              <View style={styles.paymentContainer}>
                <View style={styles.codeVerificationLabelRow}>
                  <View style={styles.labelContainer}>
                    <Text style={styles.paymentLabel}>Código (Obligatorio):</Text>
                    {__DEV__ && assignmentVerificationCode ? (
                      <Text style={styles.devCodeHint}>{assignmentVerificationCode}</Text>
                    ) : null}
                  </View>
                  {codeVerificationStatus === "valid" && (
                    <Text style={styles.checkIcon}>✓</Text>
                  )}
                  {codeVerificationStatus === "invalid" &&
                    verificationCode.length === 4 && (
                      <Text style={styles.errorIcon}>✕</Text>
                    )}
                </View>
                {isCodeLocked ? (
                  <View style={styles.lockedCodeContainer}>
                    <Text style={styles.lockedCodeText}>
                      Demasiados intentos. Intenta en {lockTimeRemaining}s
                    </Text>
                  </View>
                ) : (
                  <>
                    <TextInput
                      style={[
                        styles.paymentInput,
                        codeVerificationStatus === "invalid" &&
                          verificationCode.length === 4 &&
                          styles.inputError,
                        codeVerificationStatus === "valid" &&
                          styles.inputSuccess,
                      ]}
                      placeholder="Ingresar código..."
                      placeholderTextColor={CustomColors.divider}
                      value={verificationCode}
                      onChangeText={(text) => {
                        const cleaned = text.replace(/[^0-9]/g, "").slice(0, 4);
                        setVerificationCode(cleaned);
                      }}
                      keyboardType="numeric"
                      maxLength={4}
                      returnKeyType="done"
                      editable={!isCodeLocked}
                    />
                    {codeVerificationStatus === "invalid" &&
                      verificationCode.length === 4 && (
                        <Text style={styles.errorMessage}>
                          Código incorrecto. Intentos restantes: {3 - failedAttempts}
                        </Text>
                      )}
                  </>
                )}
              </View>
            )}
          </ScrollView>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                (!isFormValid || loading) && styles.disabledButton,
              ]}
              onPress={handleConfirm}
              disabled={!isFormValid || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Guardar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
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
    width: "90%",
    maxWidth: 500,
    maxHeight: "90%",
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
    marginTop: 10,
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
  codeVerificationLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  labelContainer: {
    flex: 1,
  },
  checkIcon: {
    fontSize: 24,
    color: "#4CAF50",
    fontWeight: "bold",
    marginLeft: 10,
  },
  errorIcon: {
    fontSize: 24,
    color: "#F44336",
    fontWeight: "bold",
    marginLeft: 10,
  },
  inputSuccess: {
    borderColor: "#4CAF50",
    borderWidth: 2,
  },
  lockedCodeContainer: {
    backgroundColor: "rgba(244, 67, 54, 0.1)",
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: "#F44336",
    alignItems: "center",
  },
  lockedCodeText: {
    color: "#F44336",
    fontSize: 16,
    fontWeight: "bold",
  },
  inputError: {
    borderColor: "#F44336",
    borderWidth: 2,
  },
  errorMessage: {
    color: "#F44336",
    fontSize: 12,
    marginTop: 4,
  },
  devCodeHint: {
    fontSize: 12,
    color: "#FFB800",
    fontWeight: "bold",
    marginTop: 2,
  },
});
