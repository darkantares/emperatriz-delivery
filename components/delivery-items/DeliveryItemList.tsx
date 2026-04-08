import React, { useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  RefreshControl,
  StyleProp,
  ViewStyle,
  Animated,
  View,
  Text,
  ActivityIndicator,
  Linking,
  Alert,
} from 'react-native';
import { Swipeable, RectButton } from 'react-native-gesture-handler';
import { FontAwesome, Ionicons } from '@expo/vector-icons';
import { DeliveryItem } from './DeliveryItem';
import { CustomColors } from '@/constants/CustomColors';
import { openWhatsAppMessage } from '@/utils/whatsapp';
import { DeliveryItemAdapter } from '@/interfaces/delivery/deliveryAdapters';

const AnimatedRow = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        delay: index * 60,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        delay: index * 60,
        useNativeDriver: true,
      }),
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
  loading?: boolean;
  refreshing?: boolean;
  onRefresh?: () => void;
  contentContainerStyle?: StyleProp<ViewStyle>;
  style?: StyleProp<ViewStyle>;
  onItemPress?: (item: DeliveryItemAdapter) => void;
}

const actionButtonWidth = 110;

export const DeliveryItemList: React.FC<DeliveryItemListProps> = ({
  data,
  loading = false,
  refreshing = false,
  onRefresh,
  contentContainerStyle,
  style,
  onItemPress,
}) => {
  const openSwipeableRef = useRef<Swipeable | null>(null);
  const rowSwipeables = useRef(new Map<string, Swipeable | null>());

  const closeOpenRow = () => {
    if (openSwipeableRef.current) {
      openSwipeableRef.current.close();
      openSwipeableRef.current = null;
    }
  };

  const formatPhone = (phone: string) => phone.replace(/\D/g, '');

  const handleWhatsApp = async (item: DeliveryItemAdapter) => {
    if (!item.phone) {
      Alert.alert('WhatsApp', 'El número de teléfono no está disponible.');
      return;
    }

    const success = await openWhatsAppMessage(formatPhone(item.phone));
    if (!success) Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp.');
    closeOpenRow();
  };

  const handleCall = (item: DeliveryItemAdapter) => {
    if (!item.phone) {
      Alert.alert('Llamada', 'El número de teléfono no está disponible.');
      return;
    }

    const phoneNumber = formatPhone(item.phone);
    Linking.openURL(`tel:${phoneNumber}`);
    closeOpenRow();
  };

  const handleSendCoordinatesWhatsApp = async (item: DeliveryItemAdapter) => {
    if (!item.phone) {
      Alert.alert('WhatsApp', 'El número de teléfono no está disponible.');
      return;
    }

    const lat = item.additionalDataNominatim?.lat;
    const lon = item.additionalDataNominatim?.lon;
    if (!lat || !lon) {
      Alert.alert('WhatsApp', 'No se encontraron coordenadas para esta entrega.');
      return;
    }

    const message = `Coordenadas de entrega:
${item.deliveryAddress}
Lat: ${lat}
Lon: ${lon}
https://maps.google.com/?q=${lat},${lon}`;
    const success = await openWhatsAppMessage(formatPhone(item.phone), message);
    if (!success) Alert.alert('WhatsApp', 'No se pudo abrir WhatsApp.');
    closeOpenRow();
  };

  const buildProgressAction = (
    item: DeliveryItemAdapter,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({ inputRange: [0, 100], outputRange: [-20, 0], extrapolate: 'clamp' });
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.leftActions, { opacity, transform: [{ translateX }] }]}>
        <RectButton
          style={[styles.swipeActionButton, styles.progressAction]}
          onPress={() => {
            closeOpenRow();
            onItemPress?.(item);
          }}
        >
          <Ionicons name="arrow-forward-circle" size={22} color="#FFFFFF" style={styles.actionIcon} />
          <Text style={styles.actionText}>Progreso</Text>
        </RectButton>

        <RectButton
          style={[styles.swipeActionButton, styles.secondaryAction]}
          onPress={() => handleSendCoordinatesWhatsApp(item)}
        >
          <FontAwesome name="map-marker" size={20} color="#FFFFFF" style={styles.actionIcon} />
          <Text style={styles.actionText}>Enviar coords</Text>
        </RectButton>
      </Animated.View>
    );
  };

  const buildRightActions = (
    item: DeliveryItemAdapter,
    progress: Animated.AnimatedInterpolation<number>,
    dragX: Animated.AnimatedInterpolation<number>
  ) => {
    const translateX = dragX.interpolate({ inputRange: [-100, 0], outputRange: [0, 20], extrapolate: 'clamp' });
    const opacity = progress.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1], extrapolate: 'clamp' });

    return (
      <Animated.View style={[styles.rightActions, { opacity, transform: [{ translateX }] }]}>
        <RectButton
          style={[styles.swipeActionButton, styles.whatsappAction]}
          onPress={() => handleWhatsApp(item)}
        >
          <FontAwesome name="whatsapp" size={20} color="#FFFFFF" style={styles.actionIcon} />
          <Text style={styles.actionText}>WhatsApp</Text>
        </RectButton>

        <RectButton
          style={[styles.swipeActionButton, styles.callAction]}
          onPress={() => handleCall(item)}
        >
          <Ionicons name="call" size={20} color="#FFFFFF" style={styles.actionIcon} />
          <Text style={styles.actionText}>Llamar</Text>
        </RectButton>
      </Animated.View>
    );
  };

  const renderItem = ({ item, index }: { item: DeliveryItemAdapter; index: number }) => {
    const itemForComponent = {
      id: item.id,
      title: item.title,
      client: item.client,
      phone: item.phone,
      type: item.type,
      deliveryAddress: item.deliveryAddress,
      currentStatus: item.deliveryStatus?.title ?? '',
    };

    return (
      <AnimatedRow index={index}>
        <Swipeable
          ref={(ref) => {
            if (ref) {
              rowSwipeables.current.set(item.id, ref);
            } else {
              rowSwipeables.current.delete(item.id);
            }
          }}
          friction={2}
          leftThreshold={40}
          rightThreshold={40}
          onSwipeableWillOpen={() => {
            const current = rowSwipeables.current.get(item.id);
            if (openSwipeableRef.current && openSwipeableRef.current !== current) {
              openSwipeableRef.current.close();
            }
            openSwipeableRef.current = current || null;
          }}
          onSwipeableClose={() => {
            if (openSwipeableRef.current === rowSwipeables.current.get(item.id)) {
              openSwipeableRef.current = null;
            }
          }}
          renderLeftActions={(progress, dragX) => buildProgressAction(item, progress, dragX)}
          renderRightActions={(progress, dragX) => buildRightActions(item, progress, dragX)}
        >
          <DeliveryItem item={itemForComponent} />
        </Swipeable>
      </AnimatedRow>
    );
  };

  const getKeyExtractor = (item: DeliveryItemAdapter) => item.id;

  if (loading && data.length === 0) {
    return (
      <View style={[styles.list, { justifyContent: 'center', alignItems: 'center' }, style] as any}>
        <ActivityIndicator size="large" color={CustomColors.secondary} />
      </View>
    );
  }

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
  leftActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-start',
    height: '91%',
    paddingHorizontal: 8,
  },
  rightActions: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'flex-end',
    height: '91%',
    paddingHorizontal: 8,
  },
  swipeActionButton: {
    width: actionButtonWidth,
    height: '91%',
    // borderRadius: 18,
    paddingVertical: 0,
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 3,
    elevation: 3,
  },
  progressAction: {
    backgroundColor: '#2ecc71',
  },
  secondaryAction: {
    backgroundColor: CustomColors.primary,
  },
  whatsappAction: {
    backgroundColor: '#25D366',
  },
  callAction: {
    backgroundColor: '#EA5455',
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    fontWeight: '700',
  },
  actionIcon: {
    marginBottom: 4,
  },
});
