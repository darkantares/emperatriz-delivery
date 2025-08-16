import { StyleSheet, Dimensions, TouchableOpacity, View } from 'react-native';
import { Text } from '@/components/Themed';
import { Swipeable } from 'react-native-gesture-handler';
import React, { useState } from 'react';
import { CustomColors } from '@/constants/CustomColors';
import { StatusUpdateModal } from '@/components/modals/StatusUpdateModal';
import { getStatusColor } from '@/interfaces/delivery/deliveryStatus';

export interface Address {
    id: string;
    label: string;
    street?: string;
    city?: string;
    zipCode?: string;
    reference?: string;
    status: string | undefined;
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
    status: string | undefined;
}

export type SwipeableRef = Swipeable | null;

interface AddressItemProps {
    item: AddressItem;
    closeAllSwipeables: (exceptId?: string) => void;
    swipeableRef: (ref: SwipeableRef) => void;
    onStatusUpdate?: (id: string, newStatus: string) => void;
}

export const AddressListItem: React.FC<AddressItemProps> = ({
    item,    closeAllSwipeables,
    swipeableRef,
    onStatusUpdate,
}) => {
    const [statusModalVisible, setStatusModalVisible] = useState(false);
    
    const handleStatusSelected = (newStatus: string) => {
        if (onStatusUpdate) {
            onStatusUpdate(item.id, newStatus);
        }
    };

    const renderRightActions = () => (
        <View style={styles.rightActions}>
            <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: CustomColors.tertiary }]}
                onPress={() => {
                    setStatusModalVisible(true);
                    closeAllSwipeables();
                }}
            >                
            <Text style={styles.actionText}>Progresar</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <>
            <Swipeable
                ref={swipeableRef}
                renderRightActions={renderRightActions}
                onSwipeableOpen={() => closeAllSwipeables(item.id)}
            >
                <View style={styles.addressContainer}>
                    <Text style={styles.addressLabel}>{item.label}</Text>
                    <Text style={styles.addressText}>{item.street}</Text>
                    {item.status && (
                        <View style={[styles.statusContainer, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                            <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                                {item.status}
                            </Text>
                        </View>
                    )}
                    <Text style={styles.addressDetails}>
                        {item.city}{item.zipCode ? `, ${item.zipCode}` : ''}
                    </Text>
                    {item.reference ? <Text style={styles.addressReference}>Ref: {item.reference}</Text> : null}
                </View>
            </Swipeable>

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
        marginBottom: 4,
        color: CustomColors.secondary,
    },
    addressText: {
        fontSize: 14,
        color: CustomColors.textLight,
    },
    addressDetails: {
        fontSize: 14,
        color: CustomColors.textLight,
        opacity: 0.7,
        marginTop: 2,
    },    addressReference: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.5,
        marginTop: 4,
        fontStyle: 'italic',
    }, 
    rightActions: {
        flexDirection: 'row',
        width: 120, // Width for a single button
        height: '100%',
    }, 
    actionButton: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        width: '100%',
    },
    actionText: {
        color: CustomColors.textLight,
        fontWeight: 'bold',
        padding: 10,
    }, statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 12,
        alignSelf: 'flex-start',
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
});
