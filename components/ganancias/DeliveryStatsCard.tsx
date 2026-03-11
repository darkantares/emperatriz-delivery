import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const stats = [
    { label: 'Entregas', value: '63', icon: 'bicycle-outline' as const },
    { label: 'Total generado', value: 'RD$ 8,820', icon: 'cash-outline' as const },
    { label: 'Promedio/entrega', value: 'RD$ 140', icon: 'analytics-outline' as const },
];

const DeliveryStatsCard = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 150, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.card}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Entregas esta semana</Text>
                        <Text style={styles.subtitle}>Resumen de actividad</Text>
                    </View>
                    <View style={styles.iconCircle}>
                        <Ionicons name="bar-chart-outline" size={20} color={CustomColors.primary} />
                    </View>
                </View>

                <View style={styles.statsGrid}>
                    {stats.map((stat, index) => (
                        <View key={index} style={[styles.statBlock, index < stats.length - 1 && styles.statBlockBorder]}>
                            <Ionicons name={stat.icon} size={18} color={CustomColors.primary} style={styles.statIcon} />
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                        </View>
                    ))}
                </View>
            </View>
        </Animated.View>
    );
};

export default DeliveryStatsCard;

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
        backgroundColor: 'rgba(255,255,255,0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    statBlock: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 4,
    },
    statBlockBorder: {
        borderRightWidth: 1,
        borderRightColor: CustomColors.divider,
        marginRight: 8,
        paddingRight: 8,
    },
    statIcon: {
        marginBottom: 8,
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        color: CustomColors.textLight,
        marginBottom: 4,
        textAlign: 'center',
    },
    statLabel: {
        fontSize: 11,
        color: CustomColors.textLight,
        opacity: 0.6,
        textAlign: 'center',
    },
});
