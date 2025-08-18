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
    Alert
} from 'react-native';
import { DeliveryStatus, getStatusColor, getNextValidStatuses } from '@/interfaces/delivery/deliveryStatus';
import { CustomColors } from '@/constants/CustomColors';
import { deliveryService } from '@/services/deliveryService';

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
    const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
    const [availableStatuses, setAvailableStatuses] = useState<DeliveryStatus[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    useEffect(() => {
        if (isVisible) {
            // Reset selected status when modal opens
            setSelectedStatus(null);
            
            // Get valid next statuses
            const nextStatuses = getNextValidStatuses(currentStatus);
            setAvailableStatuses(nextStatuses);
        }
    }, [isVisible, currentStatus]);

    const handleConfirm = async () => {
        if (selectedStatus) {
            setLoading(true);
            try {
                // Llamar al servicio para actualizar el estado
                const result = await deliveryService.updateDeliveryStatus(itemId, selectedStatus);
                
                if (result.success) {
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

    const renderStatusItem = ({ item }: { item: DeliveryStatus }) => {
        const isSelected = selectedStatus === item;
        const statusColor = getStatusColor(item);

        return (
            <TouchableOpacity
                style={[
                    styles.statusItem,
                    isSelected && { borderColor: statusColor, borderWidth: 2 }
                ]}
                onPress={() => setSelectedStatus(item)}
            >
                <View style={[styles.radioButton, isSelected && { borderColor: statusColor }]}>
                    {isSelected && <View style={[styles.radioButtonSelected, { backgroundColor: statusColor }]} />}
                </View>
                <Text style={[styles.statusText, { color: isSelected ? statusColor : CustomColors.textLight }]}>
                    {item}
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
                                    keyExtractor={(item) => item}
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
                                        (!selectedStatus || availableStatuses.length === 0) && styles.disabledButton
                                    ]} 
                                    onPress={handleConfirm}
                                    disabled={!selectedStatus || availableStatuses.length === 0 || loading}
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
});
