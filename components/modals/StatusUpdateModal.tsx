import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    TouchableWithoutFeedback,
    ActivityIndicator,
    Alert,
    TextInput,
    Image
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getStatusColor, IDeliveryStatus, getStatusIdFromTitle, setDeliveryStatuses, areStatusesLoaded, getDeliveryStatuses, validStatusTransitions } from '@/interfaces/delivery/deliveryStatus';
import { CustomColors } from '@/constants/CustomColors';
import { deliveryService } from '@/services/deliveryService';
import { deliveryStatusService } from '@/services/deliveryStatusService';
import { paymentMethodService } from '@/services/paymentMethodService';
import { IDeliveryStatusEntity, IUpdateDeliveryStatusData } from '@/interfaces/delivery/delivery';
import { IPaymentMethodEntity } from '@/interfaces/payment/payment';
import { useDelivery } from '@/context/DeliveryContext';
import { AssignmentType } from '@/utils/enum';

interface StatusUpdateModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentStatus: string;
    onStatusSelected: (newStatus: string) => void;
    itemId: string;
    itemTitle: string;
    totalAmmount: number;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
    isVisible,
    onClose,
    currentStatus,
    onStatusSelected,
    itemId,
    itemTitle,
    totalAmmount
}) => {
    const { fetchDeliveries, deliveries, inProgressDelivery } = useDelivery();
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [availableStatuses, setAvailableStatuses] = useState<IDeliveryStatusEntity[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [note, setNote] = useState<string>('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [amountPaid, setAmountPaid] = useState<string>('');
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<number | null>(null);
    const [paymentMethods, setPaymentMethods] = useState<IPaymentMethodEntity[]>([]);
    const [showPaymentMethodPicker, setShowPaymentMethodPicker] = useState<boolean>(false);

    // Estados que requieren nota obligatoria
    const statusesRequiringNote = [
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.RETURNED,
        IDeliveryStatus.ON_HOLD,
        IDeliveryStatus.SCHEDULED
    ];

    // Estados que permiten tomar foto (cámara)
    const statusesAllowingPhoto = [
        // IDeliveryStatus.CANCELLED,
        // IDeliveryStatus.RETURNED,
        // IDeliveryStatus.ON_HOLD,
        // IDeliveryStatus.SCHEDULED,
        IDeliveryStatus.DELIVERED,
    ];

    // Estados que permiten seleccionar imagen (galería)
    const statusesAllowingImage = [
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.RETURNED,
        IDeliveryStatus.ON_HOLD,
        IDeliveryStatus.SCHEDULED,
        IDeliveryStatus.DELIVERED,
    ];

    // Estados que requieren evidencia (foto o imagen) obligatoria
    const statusesRequiringEvidence = [
        IDeliveryStatus.DELIVERED
    ];

    // Determinar si el delivery actual es de tipo PICKUP (en cuyo caso no se requieren ni deben mostrarse evidencias)
    const currentDelivery = (() => {
        const found = deliveries.find(d => d.id === itemId);
        if (found) return found;
        if (inProgressDelivery && inProgressDelivery.id === itemId) return inProgressDelivery;
        return undefined;
    })();

    const isPickupType = currentDelivery?.type === AssignmentType.PICKUP;

    const requiresNote = selectedStatus && statusesRequiringNote.includes(selectedStatus as IDeliveryStatus);
    const allowsPhoto = selectedStatus && statusesAllowingPhoto.includes(selectedStatus as IDeliveryStatus) && !isPickupType;
    const allowsImage = selectedStatus && statusesAllowingImage.includes(selectedStatus as IDeliveryStatus) && !isPickupType;
    // Si es PICKUP, la evidencia no debe ser obligatoria
    const requiresEvidence = selectedStatus && statusesRequiringEvidence.includes(selectedStatus as IDeliveryStatus) && !isPickupType;
    const requiresPaymentInfo = selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType;

    // Para PICKUP, establecer monto pagado en 0 automáticamente
    useEffect(() => {
        if (isPickupType && selectedStatus === IDeliveryStatus.DELIVERED) {
            setAmountPaid('0');
        }
    }, [isPickupType, selectedStatus]);

    // Estado para validar si el formulario está completo
    const isFormValid = selectedStatus &&
        availableStatuses.length > 0 &&
        (!requiresNote || note.trim() !== '') &&
        // Si es pickup, evidencias no son requeridas ni mostradas
        (!requiresEvidence || photoUri || imageUri) &&
        // Si es pickup, el monto se establece automáticamente en 0
        (!requiresPaymentInfo || (amountPaid.trim() !== '' && selectedPaymentMethod));

    useEffect(() => {
        const loadStatuses = async () => {
            // Cargar estados del backend si no están cargados
            if (!areStatusesLoaded()) {
                try {
                    const response = await deliveryStatusService.getDeliveryStatuses();
                    if (response.success && response.data) {
                        setDeliveryStatuses(response.data);
                    } else {
                        console.error('Error al cargar estados:', response.error);
                        Alert.alert('Error', 'No se pudieron cargar los estados de entrega');
                        return;
                    }
                } catch (error) {
                    console.error('Error al cargar estados:', error);
                    Alert.alert('Error', 'Error de conexión al cargar los estados');
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
                    console.error('Error al cargar métodos de pago:', response.error);
                    Alert.alert('Error', 'No se pudieron cargar los métodos de pago');
                }
            } catch (error) {
                console.error('Error al cargar métodos de pago:', error);
                Alert.alert('Error', 'Error de conexión al cargar los métodos de pago');
            }
        };

        if (isVisible) {
            // Reset selected status, note, photo, image, amount and payment method when modal opens
            setSelectedStatus(null);
            setNote('');
            setPhotoUri(null);
            setImageUri(null);
            setAmountPaid('');
            setSelectedPaymentMethod(null);

            // Cargar estados y métodos de pago si es necesario
            Promise.all([loadStatuses(), loadPaymentMethods()]).then(() => {
                // Obtener todos los estados cargados del backend
                const allStatuses = getDeliveryStatuses();

                // Obtener las transiciones válidas basadas en el estado actual
                const currentStatusAsEnum = Object.values(IDeliveryStatus).find(
                    status => status === currentStatus
                ) as IDeliveryStatus;

                let validNextStatuses: string[] = [];

                if (currentStatusAsEnum && validStatusTransitions[currentStatusAsEnum]) {
                    // Usar las transiciones definidas en el enum
                    validNextStatuses = validStatusTransitions[currentStatusAsEnum];
                } else {
                    // Si no se encuentra el estado en el enum, mostrar todos menos el actual
                    validNextStatuses = allStatuses
                        .filter(status => status.title !== currentStatus)
                        .map(status => status.title);
                }

                // Filtrar los estados del backend que coincidan con las transiciones válidas
                const filteredStatuses = allStatuses.filter(status =>
                    validNextStatuses.includes(status.title)
                );

                setAvailableStatuses(filteredStatuses);
            });
        }
    }, [isVisible, currentStatus]);

    // Función para tomar foto
    const takePhoto = async () => {
        try {
            // Pedir permisos de cámara
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert(
                    "Permiso denegado",
                    "Se requiere permiso de cámara para tomar la foto de evidencia.",
                    [{ text: "OK" }]
                );
                return;
            }

            // Configurar opciones de la cámara
            const result = await ImagePicker.launchCameraAsync({
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error al tomar foto:', error);
            Alert.alert(
                "Error",
                "No se pudo tomar la foto. Inténtalo de nuevo.",
                [{ text: "OK" }]
            );
        }
    };

    // Función para seleccionar imagen de la galería
    const selectImageFromGallery = async () => {
        try {
            // Pedir permisos de galería
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

            if (permissionResult.granted === false) {
                Alert.alert(
                    "Permiso denegado",
                    "Se requiere permiso para acceder a la galería de imágenes.",
                    [{ text: "OK" }]
                );
                return;
            }

            // Configurar opciones de la galería
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: 'images',
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.8,
            });

            if (!result.canceled && result.assets[0]) {
                setImageUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Error al seleccionar imagen:', error);
            Alert.alert(
                "Error",
                "No se pudo seleccionar la imagen. Inténtalo de nuevo.",
                [{ text: "OK" }]
            );
        }
    };

    // Función para remover foto
    const removePhoto = () => {
        setPhotoUri(null);
    };

    // Función para remover imagen
    const removeImage = () => {
        setImageUri(null);
    };

    const handleClose = async () =>{
        onClose();
        setLoading(false);
    }
    
    const handleConfirm = async () => {
        if (selectedStatus) {
            // Validar que se haya escrito una nota si es requerida
            if (requiresNote && note.trim() === '') {
                Alert.alert(
                    "Campo requerido",
                    "Debes escribir una nota para este estado.",
                    [{ text: "OK" }]
                );
                return;
            }

            // Validar que se haya agregado evidencia si es requerida (solo para DELIVERED)
            if (requiresEvidence && !photoUri && !imageUri) {
                Alert.alert(
                    "Evidencia requerida",
                    "Debes tomar una foto o seleccionar una imagen para el estado DELIVERED.",
                    [{ text: "OK" }]
                );
                return;
            }

            // Validar que se haya ingresado la información de pago si es requerida (solo para DELIVERED)
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

            // Obtener el ID del estado seleccionado
            const statusId = getStatusIdFromTitle(selectedStatus);
            if (!statusId) {
                Alert.alert(
                    "Error",
                    "No se pudo obtener el ID del estado seleccionado.",
                    [{ text: "OK" }]
                );
                return;
            }

            setLoading(true);

            try {
                console.log('Actualizando estado a:', selectedStatus, 'con nota:', note, 'con foto:', !!photoUri, 'con imagen:', !!imageUri, 'con monto:', amountPaid, 'con método de pago:', selectedPaymentMethod);

                let result;

                // Verificar si hay evidencias para enviar
                const evidenceUris: string[] = [];
                if (photoUri) evidenceUris.push(photoUri);
                if (imageUri) evidenceUris.push(imageUri);

                if (evidenceUris.length > 0) {
                    // Preparar los datos para enviar al servicio
                    const updateData: IUpdateDeliveryStatusData = {
                        id: itemId,
                        status: statusId,
                        note: requiresNote ? note.trim() : undefined,
                        imageUris: evidenceUris,
                        amountPaid: requiresPaymentInfo && amountPaid.trim() ? parseFloat(amountPaid) : undefined,
                        paymentMethodId: requiresPaymentInfo && selectedPaymentMethod ? selectedPaymentMethod : undefined,
                    };

                    // Enviar imágenes (una o múltiples) con toda la información
                    result = await deliveryService.updateDeliveryStatusWithImages(updateData);
                } else {
                    // Sin evidencia - usar método normal (sin imágenes)
                    result = await deliveryService.updateDeliveryStatus(
                        itemId,
                        statusId,
                        requiresNote ? note.trim() : undefined,
                        requiresPaymentInfo && amountPaid.trim() ? parseFloat(amountPaid) : undefined,
                        requiresPaymentInfo && selectedPaymentMethod ? selectedPaymentMethod : undefined
                    );
                }

                if (result.success) {
                    // Llamar a fetchDeliveries para actualizar la lista completa
                    console.log('Estado actualizado con éxito, refrescando entregas...');

                    await fetchDeliveries();

                    // Llamar al callback del componente padre
                    onStatusSelected(selectedStatus);
                    onClose();
                } else {
                    console.error('Error al actualizar el estado:', result.error);
                    Alert.alert(
                        "Error",
                        `No se pudo actualizar el estado: ${result.error}`,
                        [{ text: "OK" }]
                    );
                }
            } catch (error) {
                console.error('Error al actualizar el estado:', error);
                Alert.alert(
                    "Error",
                    `Ocurrió un error inesperado: ${error instanceof Error ? error.message : 'Error desconocido'}`,
                    [{ text: "OK" }]
                );
            } finally {
                setLoading(false);
            }
        }
    };

    // Close modal when clicking outside the content area
    const handleOutsidePress = () => {
        onClose();
    };

    // Prevent clicks inside the modal content from closing the modal
    const handleContentPress = (e: any) => {
        e.stopPropagation();
    };

    const renderStatusItem = ({ item }: { item: IDeliveryStatusEntity }) => {
        const isSelected = selectedStatus === item.title;
        const statusColor = getStatusColor(item.title);

        return (
            <TouchableOpacity
                style={[
                    styles.statusItem,
                    isSelected && { borderColor: statusColor, borderWidth: 2 }
                ]}
                onPress={() => setSelectedStatus(item.title)}
            >
                <View style={[styles.radioButton, isSelected && { borderColor: statusColor }]}>
                    {isSelected && <View style={[styles.radioButtonSelected, { backgroundColor: statusColor }]} />}
                </View>
                <Text style={[styles.statusText, { color: isSelected ? statusColor : CustomColors.textLight }]}>
                    {item.title}
                </Text>
                <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
            </TouchableOpacity>
        );
    };

    return (
        <>
            <Modal
                visible={isVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={onClose}
            >
                <TouchableWithoutFeedback onPress={handleOutsidePress}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={handleContentPress}>
                            <View style={styles.modalContent}>
                                <View style={styles.modalHeader}>
                                    <Text style={styles.modalTitle}>Actualizar Estado</Text>
                                    <Text style={styles.deliveryTitle}>Cliente: {itemTitle}</Text>
                                    <Text style={styles.deliveryTitle}>Total: ${totalAmmount.toFixed(2)}</Text>
                                    <Text style={styles.currentStatus}>
                                        Estado actual: <Text style={[styles.statusValue, { color: getStatusColor(currentStatus) }]}>{currentStatus}</Text>
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
                                            No hay estados disponibles para progresión.
                                            Este es un estado final.
                                        </Text>
                                    </View>
                                )}

                                {/* Campo de nota para estados específicos */}
                                {requiresNote && (
                                    <View style={styles.noteContainer}>
                                        <Text style={styles.noteLabel}>
                                            Nota (Obligatorio):
                                        </Text>
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
                                        <Text style={styles.characterCount}>
                                            {note.length}/500 caracteres
                                        </Text>
                                    </View>
                                )}

                                {/* Campos de evidencia (foto e imagen) */}
                                {(allowsPhoto || allowsImage) && (
                                    <View style={styles.photoContainer}>
                                        <Text style={styles.photoLabel}>
                                            Evidencia {requiresEvidence ? '(obligatorio)' : '(opcional)'}:
                                        </Text>
                                        
                                        {/* Mostrar layout lado a lado cuando ambas opciones están disponibles */}
                                        {allowsPhoto && allowsImage ? (
                                            <View style={styles.imagesRowContainer}>
                                                {/* Foto de cámara */}
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
                                                            <TouchableOpacity
                                                                style={styles.placeholderButton}
                                                                onPress={takePhoto}
                                                            >
                                                                <Text style={styles.placeholderButtonText}>
                                                                    📷 Foto {requiresEvidence ? '(*)' : ''}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                                
                                                {/* Imagen de galería */}
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
                                                                <Text style={styles.placeholderButtonText}>
                                                                    🖼️ Imagen {requiresEvidence ? '(*)' : ''}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        </View>
                                                    )}
                                                </View>
                                            </View>
                                        ) : (
                                            /* Layout vertical cuando solo una opción está disponible */
                                            <>
                                                {/* Campo de foto */}
                                                {allowsPhoto && (
                                                    <View style={styles.singleImageContainer}>
                                                        {photoUri ? (
                                                            <View>
                                                                <Text style={styles.imageTypeLabel}>Foto de cámara:</Text>
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
                                                            <TouchableOpacity
                                                                style={styles.photoButton}
                                                                onPress={takePhoto}
                                                            >
                                                                <Text style={styles.photoButtonText}>
                                                                    📷 Foto {requiresEvidence ? '(obligatorio)' : '(opcional)'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}

                                                {/* Campo de imagen */}
                                                {allowsImage && (
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
                                                                <Text style={styles.photoButtonText}>
                                                                    🖼️ Imagen {requiresEvidence ? '(obligatorio)' : '(opcional)'}
                                                                </Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                )}
                                            </>
                                        )}
                                    </View>
                                )}

                                {/* Nota informativa para PICKUP: no se requieren evidencias */}
                                {isPickupType && (
                                    <View style={styles.pickupNoteContainer}>
                                        <Text style={styles.pickupNoteText}>
                                            Para recogidas (PICKUP) no se requiere evidencia fotográfica.
                                        </Text>
                                    </View>
                                )}

                                {/* Para PICKUP el monto se establece automáticamente en 0 */}
                                {selectedStatus === IDeliveryStatus.DELIVERED && !isPickupType && (
                                    <>
                                        <View style={styles.paymentContainer}>
                                            <Text style={styles.paymentLabel}>
                                                Monto Pagado (Obligatorio):
                                            </Text>
                                            <TextInput
                                                style={styles.paymentInput}
                                                placeholder="Ingrese el monto pagado..."
                                                placeholderTextColor={CustomColors.divider}
                                                value={amountPaid}
                                                onChangeText={text => {
                                                    // Solo permite números y punto decimal
                                                    const filtered = text.replace(/[^0-9.]/g, '');
                                                    setAmountPaid(filtered);
                                                }}
                                                keyboardType="numeric"
                                            />
                                        </View>

                                        <View style={styles.paymentContainer}>
                                            <Text style={styles.paymentLabel}>
                                                Método de Pago (Obligatorio):
                                            </Text>
                                            <TouchableOpacity
                                                style={styles.paymentMethodButton}
                                                onPress={() => setShowPaymentMethodPicker(true)}
                                            >
                                                <Text style={styles.paymentMethodButtonText}>
                                                    {selectedPaymentMethod
                                                        ? paymentMethods.find(pm => pm.id === selectedPaymentMethod)?.title
                                                        : 'Seleccionar método de pago...'
                                                    }
                                                </Text>
                                                <Text style={styles.dropdownArrow}>▼</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </>
                                )}

                                <View style={styles.buttonContainer}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.cancelButton]}
                                        onPress={handleClose}
                                    >
                                        <Text style={styles.buttonText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.button,
                                            styles.confirmButton,
                                            !isFormValid && styles.disabledButton
                                        ]}
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
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>

            {/* Modal para seleccionar método de pago */}
            <Modal
                visible={showPaymentMethodPicker}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowPaymentMethodPicker(false)}
            >
                <TouchableWithoutFeedback onPress={() => setShowPaymentMethodPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
                            <View style={[styles.modalContent, { maxHeight: '60%' }]}>
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
                                                    borderWidth: 2
                                                }
                                            ]}
                                            onPress={() => {
                                                setSelectedPaymentMethod(item.id);
                                                setShowPaymentMethodPicker(false);
                                            }}
                                        >
                                            <View style={[
                                                styles.radioButton,
                                                selectedPaymentMethod === item.id && {
                                                    borderColor: CustomColors.secondary
                                                }
                                            ]}>
                                                {selectedPaymentMethod === item.id && (
                                                    <View style={[
                                                        styles.radioButtonSelected,
                                                        { backgroundColor: CustomColors.secondary }
                                                    ]} />
                                                )}
                                            </View>
                                            <Text style={[
                                                styles.statusText,
                                                {
                                                    color: selectedPaymentMethod === item.id
                                                        ? CustomColors.secondary
                                                        : CustomColors.textLight
                                                }
                                            ]}>
                                                {item.title}
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                />
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton, { width: '100%', marginTop: 10 }]}
                                    onPress={() => setShowPaymentMethodPicker(false)}
                                >
                                    <Text style={styles.buttonText}>Cancelar</Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableWithoutFeedback>
                    </View>
                </TouchableWithoutFeedback>
            </Modal>
        </>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: CustomColors.backgroundDark,
        borderRadius: 10,
        padding: 20,
        width: '100%',
    },
    modalHeader: {
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: CustomColors.textLight,
        marginBottom: 10,
        textAlign: 'center',
    },
    deliveryTitle: {
        fontSize: 16,
        color: CustomColors.textLight,
        textAlign: 'center',
        marginBottom: 5,
    },
    currentStatus: {
        fontSize: 16,
        color: CustomColors.textLight,
        textAlign: 'center',
        marginBottom: 5,
    },
    statusValue: {
        fontWeight: 'bold',
    },
    statusList: {
        marginBottom: 20,
    },
    statusItem: {
        flexDirection: 'row',
        alignItems: 'center',
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
        justifyContent: 'center',
        alignItems: 'center',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        fontWeight: 'bold',
        fontSize: 16,
    },
    noStatusesContainer: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: CustomColors.backgroundDarkest,
        borderRadius: 8,
        marginBottom: 20,
    },
    noStatusesText: {
        color: CustomColors.textLight,
        textAlign: 'center',
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
        fontWeight: 'bold',
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
        textAlign: 'right',
        marginTop: 4,
    },
    photoContainer: {
        marginBottom: 20,
    },
    photoLabel: {
        fontSize: 16,
        color: CustomColors.textLight,
        marginBottom: 8,
        fontWeight: 'bold',
    },
    photoButton: {
        backgroundColor: CustomColors.backgroundDarkest,
        borderRadius: 8,
        padding: 15,
        borderWidth: 1,
        borderColor: CustomColors.divider,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 5,
    },
    photoButtonsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    photoButtonText: {
        color: CustomColors.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Estilos para botones lado a lado
    buttonsRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    photoButtonHalf: {
        flex: 0.48, // Un poco menos de la mitad para dejar espacio entre los botones
        marginVertical: 0, // Remover margen vertical para botones lado a lado
    },
    photoPreviewContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    photoPreview: {
        width: 150,
        height: 112,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    removePhotoButton: {
        position: 'absolute',
        top: 5,
        right: 5,
        backgroundColor: 'rgba(255, 0, 0, 0.8)',
        borderRadius: 15,
        width: 30,
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    removePhotoText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    // Estilos para layout de imágenes lado a lado
    imagesRowContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    imageHalfContainer: {
        flex: 0.48, // Un poco menos de la mitad para dejar espacio entre las imágenes
    },
    singleImageContainer: {
        marginTop: 10,
    },
    imageTypeLabel: {
        fontSize: 14,
        color: CustomColors.textLight,
        marginBottom: 5,
        fontWeight: '600',
    },
    photoPreviewHalf: {
        width: '100%',
        height: 100,
        borderRadius: 8,
        resizeMode: 'cover',
    },
    // Estilos para placeholders de imágenes
    imagePlaceholderContainer: {
        alignItems: 'center',
    },
    imagePlaceholder: {
        width: '100%',
        height: 100,
        borderRadius: 8,
        backgroundColor: CustomColors.backgroundDarkest,
        borderWidth: 2,
        borderColor: CustomColors.divider,
        borderStyle: 'dashed',
        justifyContent: 'center',
        alignItems: 'center',
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
        textAlign: 'center',
    },
    placeholderButton: {
        backgroundColor: CustomColors.secondary,
        borderRadius: 6,
        paddingVertical: 8,
        paddingHorizontal: 12,
        width: '100%',
        alignItems: 'center',
    },
    placeholderButtonText: {
        color: CustomColors.textLight,
        fontSize: 12,
        fontWeight: 'bold',
    },
    paymentContainer: {
        marginBottom: 20,
    },
    paymentLabel: {
        fontSize: 16,
        color: CustomColors.textLight,
        marginBottom: 8,
        fontWeight: 'bold',
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        backgroundColor: 'rgba(255,255,255,0.03)',
        borderRadius: 8,
        padding: 10,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.04)'
    },
    pickupNoteText: {
        color: CustomColors.textLight,
        fontSize: 14,
        opacity: 0.9,
    },
});
