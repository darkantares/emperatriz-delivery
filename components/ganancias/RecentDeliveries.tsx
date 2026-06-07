import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withDelay } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';
import { RecentDeliveryItem } from '@/core/actions/ganancias-actions';
import { Capitalize } from '@/utils/capitalize';

const formatRelativeTime = (isoString: string): string => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Hace un momento';
    if (minutes < 60) return `Hace ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Hace ${hours} hora${hours !== 1 ? 's' : ''}`;
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Ayer';
    return `Hace ${days} dias`;
};

const ActivityRow = ({ item, index }: { item: RecentDeliveryItem; index: number }) => {
    const slideAnim = useSharedValue(20);
    const opacityAnim = useSharedValue(0);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: opacityAnim.value,
        transform: [{ translateX: slideAnim.value }],
    }));

    useEffect(() => {
        slideAnim.value = withDelay(100 * index, withTiming(0, { duration: 400 }));
        opacityAnim.value = withDelay(100 * index, withTiming(1, { duration: 400 }));
    }, []);

    return (
        <Animated.View style={[styles.row, animatedStyle]}> 
            <View style={styles.iconContainer}>
                <Ionicons name="bicycle-outline" size={18} color={CustomColors.primary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.clientName} numberOfLines={1}>{Capitalize(item.contact)}</Text>
                <Text style={styles.zoneText}>{Capitalize(item.zone)} - {formatRelativeTime(item.completedAt)}</Text>
            </View>
            {/* <Text style={styles.earningText}>+{formatDOP(item.earning)}</Text> */}
        </Animated.View>
    );
};

interface RecentDeliveriesProps {
    items?: RecentDeliveryItem[];
    isLoading?: boolean;
}

const EMPTY_ITEMS: RecentDeliveryItem[] = [];

const RecentDeliveries = ({ items = EMPTY_ITEMS, isLoading = false }: RecentDeliveriesProps) => {
    const fadeAnim = useSharedValue(0);
    const slideAnim = useSharedValue(30);

    const animatedStyle = useAnimatedStyle(() => ({
        opacity: fadeAnim.value,
        transform: [{ translateY: slideAnim.value }],
    }));

    useEffect(() => {
        fadeAnim.value = withDelay(450, withTiming(1, { duration: 700 }));
        slideAnim.value = withDelay(450, withTiming(0, { duration: 700 }));
    }, []);

    return (
        <Animated.View style={[styles.wrapper, animatedStyle]}> 
            <View style={styles.card}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Entregas recientes</Text>
                        <Text style={styles.subtitle}>Ultimas completadas</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        <Ionicons name="flash-outline" size={20} color="#059669" />
                    </View>
                </View>

                {isLoading ? (
                    <ActivityIndicator color={CustomColors.primary} style={{ marginVertical: 16 }} />
                ) : items.length === 0 ? (
                    <Text style={styles.emptyText}>Sin entregas recientes</Text>
                ) : (
                    <View style={styles.list}>
                        {items.map((item, index) => (
                            <React.Fragment key={item.id}>
                                <ActivityRow item={item} index={index} />
                                {index < items.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        ))}
                    </View>
                )}
            </View>
        </Animated.View>
    );
};

export default RecentDeliveries;

const styles = StyleSheet.create({
    wrapper: {
        marginHorizontal: 2,
        marginBottom: 16,
        borderRadius: 20,
        boxShadow: '0px 4px 12px rgba(0,0,0,0.08)',
    },
    card: {
        borderRadius: 20,
        padding: 20,
        backgroundColor: CustomColors.backgroundDark,
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 18,
    },
    title: {
        fontSize: 16,
        fontWeight: '700',
        color: CustomColors.textLight,
        marginBottom: 3,
    },
    subtitle: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.6,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(5,150,105,0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    list: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        gap: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    rowContent: {
        flex: 1,
    },
    clientName: {
        fontSize: 14,
        fontWeight: '600',
        color: CustomColors.textLight,
        marginBottom: 3,
    },
    zoneText: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.5,
    },
    earningText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#059669',
    },
    divider: {
        height: 1,
        backgroundColor: CustomColors.divider,
    },
    emptyText: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.4,
        textAlign: 'center',
        paddingVertical: 16,
    },
});
