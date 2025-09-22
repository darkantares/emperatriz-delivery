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
import { IDeliveryStatusEntity } from '@/interfaces/delivery/delivery';
import { useDelivery } from '@/context/DeliveryContext';

interface StatusUpdateModalProps {
    isVisible: boolean;
    onClose: () => void;
    currentStatus: string;
    onStatusSelected: (newStatus: string) => void;
    itemId: string;
}

export const StatusUpdateModal: React.FC<StatusUpdateModalProps> = ({
    isVisible,
    onClose,
    currentStatus,
    onStatusSelected,
    itemId
}) => {
    const { fetchDeliveries } = useDelivery();
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [availableStatuses, setAvailableStatuses] = useState<IDeliveryStatusEntity[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [note, setNote] = useState<string>('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);

    // Estados que requieren nota obligatoria
    const statusesRequiringNote = [
        IDeliveryStatus.CANCELLED,
        IDeliveryStatus.RETURNED,
        // IDeliveryStatus.DELIVERED,
        IDeliveryStatus.ON_HOLD,
        IDeliveryStatus.SCHEDULED
    ];

    // Estados que requieren evidencia fotográfica
    const statusesRequiringPhoto = [IDeliveryStatus.DELIVERED];

    const requiresNote = selectedStatus && statusesRequiringNote.includes(selectedStatus as IDeliveryStatus);
    const requiresPhoto = selectedStatus && statusesRequiringPhoto.includes(selectedStatus as IDeliveryStatus);

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

        if (isVisible) {
            // Reset selected status, note and photo when modal opens
            setSelectedStatus(null);
            setNote('');
            setPhotoUri(null);

            // Cargar estados si es necesario
            loadStatuses().then(() => {
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

    // Función para remover foto
    const removePhoto = () => {
        setPhotoUri(null);
    };

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

            // Validar que se haya tomado una foto si es requerida
            if (requiresPhoto && !photoUri) {
                Alert.alert(
                    "Foto requerida",
                    "Este estado requiere una foto de evidencia de la entrega.",
                    [{ text: "OK" }]
                );
                return;
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
                console.log('Actualizando estado a:', selectedStatus, 'con nota:', note, 'con foto:', !!photoUri);
                
                let result;
                
                // Si tiene foto, usar el método con imagen
                if (photoUri) {
                    result = await deliveryService.updateDeliveryStatusWithImage(
                        itemId,
                        statusId,
                        requiresNote ? note.trim() : undefined,
                        photoUri
                    );
                } else {
                    // Usar el método normal sin imagen
                    result = await deliveryService.updateDeliveryStatus(
                        itemId,
                        statusId,
                        requiresNote ? note.trim() : undefined
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
    };    // Close modal when clicking outside the content area
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
                                        Nota requerida para este estado:
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

                            {/* Campo de foto para estados específicos */}
                            {requiresPhoto && (
                                <View style={styles.photoContainer}>
                                    <Text style={styles.photoLabel}>
                                        Foto de evidencia requerida:
                                    </Text>
                                    {photoUri ? (
                                        <View style={styles.photoPreviewContainer}>
                                            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
                                            <TouchableOpacity
                                                style={styles.removePhotoButton}
                                                onPress={removePhoto}
                                            >
                                                <Text style={styles.removePhotoText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    ) : (
                                        <TouchableOpacity
                                            style={styles.photoButton}
                                            onPress={takePhoto}
                                        >
                                            <Text style={styles.photoButtonText}>📷 Tomar Foto</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                >
                                    <Text style={styles.buttonText}>Cancelar</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.button,
                                        styles.confirmButton,
                                        (!selectedStatus || availableStatuses.length === 0 || (requiresNote && note.trim() === '') || (requiresPhoto && !photoUri)) && styles.disabledButton
                                    ]}
                                    onPress={handleConfirm}
                                    disabled={!selectedStatus || availableStatuses.length === 0 || loading || (!!requiresNote && note.trim() === '') || (!!requiresPhoto && !photoUri)}
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
        maxHeight: '80%',
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
    },
    photoButtonText: {
        color: CustomColors.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    photoPreviewContainer: {
        position: 'relative',
        alignItems: 'center',
    },
    photoPreview: {
        width: 200,
        height: 150,
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
});
