import React, { useRef, useEffect,useState } from 'react';
import { StyleSheet, Animated, TouchableOpacity, Dimensions, View as RNView } from 'react-native';
import { Text, View } from '@/components/Themed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useAppContext } from '@/context/AppContext';
import { AddressList } from '@/components/delivery-items/AddressList';
import { AddressItem } from '@/components/delivery-items/AddressListItem';
import { router } from 'expo-router';
import { AntDesign } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const { height } = Dimensions.get('window');

export default function AddressesModal() {
    const { selectedAddresses } = useAppContext();
    // console.log(selectedAddresses);

    const [addresses, setAddresses] = useState<AddressItem[]>(
        selectedAddresses
            ? selectedAddresses.addresses.map(addr => ({
                ...addr,
                elementId: selectedAddresses.elementId,
                elementTitle: selectedAddresses.elementTitle,
                street: addr.street || '',
                city: addr.city || '',
                zipCode: addr.zipCode || '',
                reference: addr.reference || '',
                cost: addr.cost || 0,
                status: addr.status,
            }))
            : []
    );

    // Animación para deslizar desde abajo
    const slideAnim = useRef(new Animated.Value(height)).current;

    useEffect(() => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, []);

    const closeModal = () => {
        Animated.timing(slideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            router.back();
        });
    };

    const handleEditAddress = (id: string) => {
        console.log('Editar dirección:', id);
    };

    const handleDeleteAddress = (id: string) => {
        setAddresses(addresses.filter(address => address.id !== id));
    };    const handleStatusUpdate = (id: string, newStatus: string) => {
        setAddresses(addresses.map(address => 
            address.id === id 
                ? { ...address, status: newStatus } 
                : address
        ));
    };

    return (
        <RNView style={styles.overlay}>
            <Animated.View
                style={[
                    styles.modalContainer,
                    { transform: [{ translateY: slideAnim }] }
                ]}
            >
                <GestureHandlerRootView style={styles.gestureRoot}>
                    <View style={styles.header}>            
                      <View style={styles.headerSide} />
                      <View style={styles.headerCenter}>
                        <Text
                          style={styles.title}
                          numberOfLines={2}
                          ellipsizeMode="tail"
                        >
                          {selectedAddresses
                            ? `de ${selectedAddresses.elementTitle}`
                            : 'No hay direcciones seleccionadas'}
                        </Text>
                      </View>
            
                      <View style={styles.headerSide}>
                        <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
                          <AntDesign name="close" size={24} color={CustomColors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>
            
                    <AddressList
                        addresses={addresses}
                        onEditAddress={handleEditAddress}
                        onDeleteAddress={handleDeleteAddress}
                        onStatusUpdate={handleStatusUpdate}
                    />
                </GestureHandlerRootView>
            </Animated.View>
        </RNView>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
    },
    modalContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: '90%',
        backgroundColor: CustomColors.backgroundDarkest,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingTop: 15,
        shadowColor: 'rgba(0,0,0,0.5)',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8,
    },
    gestureRoot: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 10,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: CustomColors.divider,
        // Quita el fondo del header para que sea igual al modal
        backgroundColor: 'transparent',
        marginBottom: 5,
    },
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        // Fondo transparente para que no resalte el círculo
        backgroundColor: 'transparent',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        color: CustomColors.secondary,
    },
    headerSide: {
        width: 48, // igual o mayor al ancho del botón
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8,
    },
});
