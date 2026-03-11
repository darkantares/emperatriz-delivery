import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const activities = [
    { id: '1', client: 'María García', earning: '+RD$ 180', time: 'Hace 1 hora', zone: 'Piantini', icon: 'bicycle-outline' },
    { id: '2', client: 'Carlos Méndez', earning: '+RD$ 120', time: 'Hace 3 horas', zone: 'Naco', icon: 'bicycle-outline' },
    { id: '3', client: 'Laura Pérez', earning: '+RD$ 200', time: 'Ayer 7:45 pm', zone: 'Evaristo Morales', icon: 'bicycle-outline' },
    { id: '4', client: 'Roberto Díaz', earning: '+RD$ 95', time: 'Ayer 2:30 pm', zone: 'Bella Vista', icon: 'bicycle-outline' },
    { id: '5', client: 'Ana López', earning: '+RD$ 150', time: 'Hace 2 días', zone: 'Serrallés', icon: 'bicycle-outline' },
];

const ActivityRow = ({ item, index }: { item: typeof activities[0]; index: number }) => {
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
                <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={18} color={CustomColors.primary} />
            </View>
            <View style={styles.rowContent}>
                <Text style={styles.clientName} numberOfLines={1}>{item.client}</Text>
                <Text style={styles.zoneText}>{item.zone} · {item.time}</Text>
            </View>
            <Text style={styles.earningText}>{item.earning}</Text>
        </Animated.View>
    );
};

const RecentDeliveries = () => {
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
                        <Text style={styles.subtitle}>Últimas completadas</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        <Ionicons name="flash-outline" size={20} color="#059669" />
                    </View>
                </View>

                <View style={styles.list}>
                    {activities.map((item, index) => (
                        <React.Fragment key={item.id}>
                            <ActivityRow item={item} index={index} />
                            {index < activities.length - 1 && <View style={styles.divider} />}
                        </React.Fragment>
                    ))}
                </View>
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
        backgroundColor: 'rgba(5,150,105,0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.25)',
    },
    list: {
        gap: 0,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: 'rgba(255,255,255,0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    rowContent: {
        flex: 1,
        marginRight: 8,
    },
    clientName: {
        fontSize: 14,
        fontWeight: '600',
        color: CustomColors.textLight,
        marginBottom: 2,
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
});
