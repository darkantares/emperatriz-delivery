import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
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
    const slideAnim = useRef(new Animated.Value(20)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 400, delay: 100 * index, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 400, delay: 100 * index, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.row, { opacity: opacityAnim, transform: [{ translateX: slideAnim }] }]}> 
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

const RecentDeliveries = ({ items = [], isLoading = false }: RecentDeliveriesProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 450, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 450, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}> 
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
        marginHorizontal: 20,
        marginBottom: 16,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
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
