import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import React, { useState } from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { StatusUpdateModal } from '@/components/modals/StatusUpdateModal';
import { getStatusColor } from '@/interfaces/delivery/deliveryStatus';
import { FontAwesome } from '@expo/vector-icons';

export interface Address {
    id: string;
    label: string;
    street?: string;
    city?: string;
    zipCode?: string;
    reference?: string;
    status: string;
    cost: number;
}

export interface AddressItem {
    id: string;
    elementId: string;
    elementTitle: string;
    label: string;
    street: string;
    city: string;
    zipCode: string;
    reference: string;
    status: string;   
    cost: number; 
}

interface AddressItemProps {
    item: AddressItem;
    onStatusUpdate?: (id: string, newStatus: string) => void;
}

export const AddressListItem: React.FC<AddressItemProps> = ({
    item,
    onStatusUpdate,
}) => {
    const [statusModalVisible, setStatusModalVisible] = useState(false);

    const handleStatusSelected = (newStatus: string) => {
        if (onStatusUpdate) {
            onStatusUpdate(item.id, newStatus);
        }
    };

    return (
        <>
            <View style={styles.addressContainer}>
                <View style={styles.row}>
                    {/* Columna izquierda */}
                    <View style={styles.leftColumn}>
                        <Text style={styles.addressLabel}>{item.label}</Text>
                        <Text style={styles.addressText}>{item.street}</Text>
                        <Text style={styles.addressDetails}>{item.city}</Text>
                        {item.reference ? <Text style={styles.addressReference}>Ref: {item.reference}</Text> : null}
                    </View>
                    {/* Columna derecha */}
                    <View style={styles.rightColumn}>
                        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(item.status)}]}>
                            <Text style={styles.statusText}>{item.status}</Text>
                        </View>
                        <Text style={styles.amountLabel}>Monto a cobrar:</Text>
                        <Text style={styles.amountValue}>$RD {item.cost || 0}</Text>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: CustomColors.tertiary, marginTop: 8 }]}
                            onPress={() => setStatusModalVisible(true)}
                        >
                            <Text style={styles.actionText}>Progresar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <StatusUpdateModal
                isVisible={statusModalVisible}
                onClose={() => setStatusModalVisible(false)}
                currentStatus={item.status || 'Pendiente'}
                onStatusSelected={handleStatusSelected}
                itemId={item.id}
            />
        </>
    );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
    addressContainer: {
        backgroundColor: CustomColors.cardBackground,
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: CustomColors.divider,
        width: width,
    },
    addressLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 2,
        color: CustomColors.secondary,
    },
    addressText: {
        fontSize: 14,
        color: CustomColors.textLight,
        marginBottom: 2,
    },
    addressDetails: {
        fontSize: 14,
        color: CustomColors.textLight,
        opacity: 0.7,
        marginBottom: 2,
    },
    addressReference: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.5,
        fontStyle: 'italic',
        marginBottom: 2,
    },
    leftColumn: {
        flex: 2,
        paddingRight: 10,
        justifyContent: 'center',
    },
    rightColumn: {
        flex: 1,
        alignItems: 'flex-end',
        justifyContent: 'center',
    },
    amountLabel: {
        fontSize: 13,
        color: CustomColors.secondary,
        fontWeight: 'bold',
        marginTop: 2,
    },
    amountValue: {
        fontSize: 16,
        color: CustomColors.secondary,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    actionButton: {
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 10,
        // paddingVertical: 4,
        borderRadius: 8,
    },
    actionText: {
        color: CustomColors.textLight,
        fontWeight: 'bold',
        padding: 10,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-end',
        marginVertical: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 6,
    },
    statusText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
   swipeIndicator: {
    marginLeft: 10,
    opacity: 0.7,
},
});
