import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  getStatusColor,
  IDeliveryStatus,
  getStatusIdFromTitle,
  setDeliveryStatuses,
  areStatusesLoaded,
  getDeliveryStatuses,
  validStatusTransitions,
} from "@/interfaces/delivery/deliveryStatus";
import { CustomColors } from "@/constants/CustomColors";
import { deliveryService } from "@/services/deliveryService";
import { deliveryStatusService } from "@/services/deliveryStatusService";
import { paymentMethodService } from "@/services/paymentMethodService";
import {
  IDeliveryStatusEntity,
  IUpdateDeliveryStatusData,
} from "@/interfaces/delivery/delivery";
import { IPaymentMethodEntity } from "@/interfaces/payment/payment";
import { useDelivery } from "@/context/DeliveryContext";
import { AssignmentType } from "@/utils/enum";

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
  const [availableStatuses, setAvailableStatuses] = useState<
    IDeliveryStatusEntity[]
  >([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [note, setNote] = useState<string>("");
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [amountPaid, setAmountPaid] = useState<string>("");
  const [amountPaidEdited, setAmountPaidEdited] = useState<boolean>(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    number | null
  >(null);
  const [paymentMethods, setPaymentMethods] = useState<IPaymentMethodEntity[]>(
    []
  );
  const [showPaymentMethodPicker, setShowPaymentMethodPicker] =
    useState<boolean>(false);

  const statusesRequiringNote = [
    IDeliveryStatus.CANCELLED,
    IDeliveryStatus.RETURNED,
    IDeliveryStatus.ON_HOLD,
    IDeliveryStatus.SCHEDULED,
  ];
  const statusesAllowingPhoto = [IDeliveryStatus.DELIVERED];
  const statusesAllowingImage = [
    IDeliveryStatus.CANCELLED,
    IDeliveryStatus.RETURNED,
    IDeliveryStatus.ON_HOLD,
    IDeliveryStatus.SCHEDULED,
    IDeliveryStatus.DELIVERED,
  ];
  const statusesRequiringEvidence = [IDeliveryStatus.DELIVERED];

  const currentDelivery = (() => {
    const found = deliveries.find((d) => d.id === itemId);
    if (found) return found;
    if (inProgressDelivery && inProgressDelivery.id === itemId)
      return inProgressDelivery;
    return undefined;
  })();
  const isPickupType = currentDelivery?.type === AssignmentType.PICKUP;

  const requiresNote =
    selectedStatus &&
    statusesRequiringNote.includes(selectedStatus as IDeliveryStatus);
  const allowsPhoto =
    selectedStatus &&
    statusesAllowingPhoto.includes(selectedStatus as IDeliveryStatus) &&
    !isPickupType;
  const allowsImage =
    selectedStatus &&
    statusesAllowingImage.includes(selectedStatus as IDeliveryStatus) &&
    !isPickupType;
  const requiresEvidence =
    selectedStatus &&
    statusesRequiringEvidence.includes(selectedStatus as IDeliveryStatus) &&
    !isPickupType;
  const requiresPaymentInfo =
    selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType;

  const selectedPaymentTitle = selectedPaymentMethod
    ? paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.title?.toLowerCase()
    : null;
  const requiresGalleryImage = !!(
    selectedStatus === IDeliveryStatus.DELIVERED &&
    !isPickupType &&
    selectedPaymentTitle &&
    (selectedPaymentTitle === "transferencia" ||
      selectedPaymentTitle === "transfer")
  );
  const requiresCameraPhoto =
    selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType;
  const showEvidence = requiresCameraPhoto || requiresGalleryImage;

  useEffect(() => {
    if (isPickupType && selectedStatus === IDeliveryStatus.DELIVERED) {
      setAmountPaid("0");
    }
  }, [isPickupType, selectedStatus]);

  useEffect(() => {
    if (
      selectedStatus === IDeliveryStatus.DELIVERED &&
      !isPickupType &&
      !amountPaidEdited
    ) {
      setAmountPaid(totalAmmount.toFixed(2));
    }
  }, [selectedStatus, isPickupType, totalAmmount, amountPaidEdited]);

  const isFormValid =
    selectedStatus &&
    availableStatuses.length > 0 &&
    (!requiresNote || note.trim() !== "") &&
    (!requiresCameraPhoto || photoUri) &&
    (!requiresGalleryImage || imageUri) &&
    (!requiresPaymentInfo || (amountPaid.trim() !== "" && selectedPaymentMethod));

  useEffect(() => {
    const loadStatuses = async () => {
      if (!areStatusesLoaded()) {
        try {
          const response = await deliveryStatusService.getDeliveryStatuses();
          if (response.success && response.data) {
            setDeliveryStatuses(response.data);
          } else {
            Alert.alert("Error", "No se pudieron cargar los estados de entrega");
            return;
          }
        } catch {
          Alert.alert("Error", "Error de conexión al cargar los estados");
          return;
        }
      }
    };

    const loadPaymentMethods = async () => {
      try {
        const response = await paymentMethodService.getPaymentMethods();
        if (response.success && response.data) {
          setPaymentMethods(response.data);
        } else {
          Alert.alert("Error", "No se pudieron cargar los métodos de pago");
        }
      } catch {
        Alert.alert("Error", "Error de conexión al cargar los métodos de pago");
      }
    };

    setSelectedStatus(null);
    setNote("");
    setPhotoUri(null);
    setImageUri(null);
    setAmountPaid("");
    setSelectedPaymentMethod(null);
    setAmountPaidEdited(false);

    Promise.all([loadStatuses(), loadPaymentMethods()]).then(() => {
      const allStatuses = getDeliveryStatuses();
      const currentStatusAsEnum = Object.values(IDeliveryStatus).find(
        (status) => status === currentStatus
      ) as IDeliveryStatus;

      let validNextStatuses: string[] = [];
      if (currentStatusAsEnum && validStatusTransitions[currentStatusAsEnum]) {
        validNextStatuses = validStatusTransitions[currentStatusAsEnum];
      } else {
        validNextStatuses = allStatuses
          .filter((status) => status.title !== currentStatus)
          .map((status) => status.title);
      }

      const filteredStatuses = allStatuses.filter((status) =>
        validNextStatuses.includes(status.title)
      );
      setAvailableStatuses(filteredStatuses);
    });
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
      if (requiresEvidence && !photoUri && !imageUri) {
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
            paymentMethodId:
              requiresPaymentInfo && selectedPaymentMethod
                ? selectedPaymentMethod
                : undefined,
          };
          result = await deliveryService.updateDeliveryStatusWithImages(updateData);
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

  const renderStatusItem = ({ item }: { item: IDeliveryStatusEntity }) => {
    const isSelected = selectedStatus === item.title;
    const statusColor = getStatusColor(item.title);
    return (
      <TouchableOpacity
        style={[
          styles.statusItem,
          isSelected && { borderColor: statusColor, borderWidth: 2 },
        ]}
        onPress={() => setSelectedStatus(item.title)}
      >
        <View
          style={[styles.radioButton, isSelected && { borderColor: statusColor }]}
        >
          {isSelected && (
            <View
              style={[
                styles.radioButtonSelected,
                { backgroundColor: statusColor },
              ]}
            />
          )}
        </View>
        <Text
          style={[
            styles.statusText,
            { color: isSelected ? statusColor : CustomColors.textLight },
          ]}
        >
          {item.title}
        </Text>
        <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
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
              {currentStatus}
            </Text>
          </Text>
        </View>

        {availableStatuses.length > 0 ? (
          <FlatList
            data={availableStatuses}
            renderItem={renderStatusItem}
            keyExtractor={(item) => item.id.toString()}
            style={styles.statusList}
          />
        ) : (
          <View style={styles.noStatusesContainer}>
            <Text style={styles.noStatusesText}>
              No hay estados disponibles para progresión. Este es un estado final.
            </Text>
          </View>
        )}

        {requiresNote && (
          <View style={styles.noteContainer}>
            <Text style={styles.noteLabel}>Nota (Obligatorio):</Text>
            <TextInput
              style={styles.noteInput}
              placeholder="Escribe una nota explicando el motivo..."
              placeholderTextColor={CustomColors.divider}
              value={note}
              onChangeText={setNote}
              multiline={true}
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.characterCount}>{note.length}/500 caracteres</Text>
          </View>
        )}

        {selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType && (
          <View style={styles.paymentContainer}>
            <Text style={styles.paymentLabel}>Método de Pago (Obligatorio):</Text>
            <TouchableOpacity
              style={styles.paymentMethodButton}
              onPress={() => setShowPaymentMethodPicker(true)}
            >
              <Text style={styles.paymentMethodButtonText}>
                {selectedPaymentMethod
                  ? paymentMethods.find((pm) => pm.id === selectedPaymentMethod)?.title
                  : "Seleccionar método de pago..."}
              </Text>
              <Text style={styles.dropdownArrow}>▼</Text>
            </TouchableOpacity>
          </View>
        )}

        {showEvidence && (
          <View style={styles.photoContainer}>
            <Text style={styles.photoLabel}>Evidencia (obligatorio):</Text>
            {requiresCameraPhoto && requiresGalleryImage ? (
              <View style={styles.imagesRowContainer}>
                <View style={styles.imageHalfContainer}>
                  <Text style={styles.imageTypeLabel}>Foto de cámara:</Text>
                  {photoUri ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: photoUri }} style={styles.photoPreviewHalf} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={removePhoto}
                      >
                        <Text style={styles.removePhotoText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholderContainer}>
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderIcon}>📷</Text>
                        <Text style={styles.placeholderText}>No image selected</Text>
                      </View>
                      <TouchableOpacity style={styles.placeholderButton} onPress={takePhoto}>
                        <Text style={styles.placeholderButtonText}>📷 Foto (*)</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
                <View style={styles.imageHalfContainer}>
                  <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
                  {imageUri ? (
                    <View style={styles.photoPreviewContainer}>
                      <Image source={{ uri: imageUri }} style={styles.photoPreviewHalf} />
                      <TouchableOpacity
                        style={styles.removePhotoButton}
                        onPress={removeImage}
                      >
                        <Text style={styles.removePhotoText}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.imagePlaceholderContainer}>
                      <View style={styles.imagePlaceholder}>
                        <Text style={styles.placeholderIcon}>🖼️</Text>
                        <Text style={styles.placeholderText}>No image selected</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.placeholderButton}
                        onPress={selectImageFromGallery}
                      >
                        <Text style={styles.placeholderButtonText}>🖼️ Imagen (*)</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <>
                {requiresCameraPhoto && (
                  <View style={styles.singleImageContainer}>
                    {photoUri ? (
                      <View>
                        <View style={styles.photoPreviewContainer}>
                          <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={removePhoto}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.photoButton} onPress={takePhoto}>
                        <Text style={styles.photoButtonText}>📷 Foto (obligatorio)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
                {requiresGalleryImage && (
                  <View style={styles.singleImageContainer}>
                    {imageUri ? (
                      <View>
                        <Text style={styles.imageTypeLabel}>Imagen de galería:</Text>
                        <View style={styles.photoPreviewContainer}>
                          <Image source={{ uri: imageUri }} style={styles.photoPreview} />
                          <TouchableOpacity
                            style={styles.removePhotoButton}
                            onPress={removeImage}
                          >
                            <Text style={styles.removePhotoText}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.photoButton}
                        onPress={selectImageFromGallery}
                      >
                        <Text style={styles.photoButtonText}>🖼️ Imagen (obligatorio)</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {isPickupType && (
          <View style={styles.pickupNoteContainer}>
            <Text style={styles.pickupNoteText}>
              Para recogidas (PICKUP) no se requiere evidencia fotográfica.
            </Text>
          </View>
        )}

        {selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType && (
          <>
            <View style={styles.paymentContainer}>
              <Text style={styles.paymentLabel}>Monto Pagado (Obligatorio):</Text>
              <TextInput
                style={styles.paymentInput}
                placeholder="Ingrese el monto pagado..."
                placeholderTextColor={CustomColors.divider}
                value={amountPaid}
                onChangeText={(text) => {
                  const filtered = text.replace(/[^0-9.]/g, "");
                  setAmountPaid(filtered);
                  setAmountPaidEdited(true);
                }}
                keyboardType="numeric"
              />
            </View>
          </>
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

      <Modal
        visible={showPaymentMethodPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPaymentMethodPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: "60%" }]}>
            <Text style={styles.modalTitle}>Seleccionar Método de Pago</Text>
            <FlatList
              data={paymentMethods}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.statusItem,
                    selectedPaymentMethod === item.id && {
                      borderColor: CustomColors.secondary,
                      borderWidth: 2,
                    },
                  ]}
                  onPress={() => {
                    setSelectedPaymentMethod(item.id);
                    setShowPaymentMethodPicker(false);
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
              )}
            />
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { width: "100%", marginTop: 10 }]}
              onPress={() => setShowPaymentMethodPicker(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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

