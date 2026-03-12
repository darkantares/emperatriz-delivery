import React, { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, RefreshControl, StyleProp, ViewStyle, Animated, View, Text } from 'react-native';
import { Item, DeliveryItem } from './DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

const AnimatedRow = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 500, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
      {children}
    </Animated.View>
  );
};

interface DeliveryItemListProps {
  data: DeliveryItemAdapter[];
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  onProgress?: () => void;
}

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
  onProgress,
}) => {
  const renderItem = ({ item, index }: { item: DeliveryItemAdapter; index: number }) => {
    // Convertir DeliveryItemAdapter a Item para compatibilidad
    const itemForComponent: Item = {
      id: item.id,
      title: item.title,
      client: item.client,
      phone: item.phone,
      type: item.type,
      deliveryAddress: item.deliveryAddress,
      provincia: item.provincia,
      municipio: item.municipio,
      origin: item.origin,
      destiny: item.destiny,
      deliveryStatus: item.deliveryStatus,
      deliveryCost: item.deliveryCost,
      amountToBeCharged: item.amountToBeCharged,
      enterprise: item.enterprise,
      isGroup: item.isGroup,
      shipmentId: item.shipmentId,
    };
    return (
      <AnimatedRow index={index}>
        <DeliveryItem 
          item={itemForComponent}
          onAction={index === 0 ? onProgress : undefined}
        />
      </AnimatedRow>
    );
  };

  const getKeyExtractor = (item: DeliveryItemAdapter) => item.id;

  return (
    <FlatList
      data={data}
      renderItem={renderItem}
      keyExtractor={getKeyExtractor}
      style={[styles.list, style]}
      contentContainerStyle={contentContainerStyle}
      ListEmptyComponent={
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No hay entregas disponibles</Text>
        </View>
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[CustomColors.secondary]}
          tintColor={CustomColors.secondary}
          progressBackgroundColor={CustomColors.backgroundDark}
        />
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    width: '100%',
    paddingTop: 14,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 40,
  },
  emptyText: {
    color: CustomColors.textLight,
    fontSize: 16,
    opacity: 0.6,
  },
});