import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const payouts = [
    { id: '1', week: 'Semana 10', amount: 'RD$ 4,820', date: 'Viernes 7 Mar', status: 'Pagado' },
    { id: '2', week: 'Semana 9', amount: 'RD$ 5,340', date: 'Viernes 28 Feb', status: 'Pagado' },
    { id: '3', week: 'Semana 8', amount: 'RD$ 3,950', date: 'Viernes 21 Feb', status: 'Pagado' },
    { id: '4', week: 'Semana 7', amount: 'RD$ 6,100', date: 'Viernes 14 Feb', status: 'Pagado' },
    { id: '5', week: 'Semana 6', amount: 'RD$ 4,420', date: 'Viernes 7 Feb', status: 'Pagado' },
];

const PayoutCard = ({ item, index }: { item: typeof payouts[0]; index: number }) => {
    const slideAnim = useRef(new Animated.Value(30)).current;
    const opacityAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: 0, duration: 500, delay: 120 * index, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1, duration: 500, delay: 120 * index, useNativeDriver: true }),
        ]).start();
    }, []);

    return (
        <Animated.View style={[styles.cardWrapper, { opacity: opacityAnim, transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.card}>
                <View style={styles.accentBar} />
                <View style={styles.cardLeft}>
                    <Text style={styles.weekLabel}>{item.week}</Text>
                    <Text style={styles.amount}>{item.amount}</Text>
                    <Text style={styles.dateText}>{item.date}</Text>
                </View>
                <View style={styles.cardRight}>
                    <View style={styles.statusBadge}>
                        <Ionicons name="checkmark-circle" size={14} color="#059669" />
                        <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

const PayoutHistory = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Summary card */}
            <View style={styles.summaryWrapper}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TOTAL PAGADO (ÚLTIMAS 5 SEMANAS)</Text>
                    <Text style={styles.summaryAmount}>RD$ 24,630</Text>
                    <View style={styles.summaryRow}>
                        <Ionicons name="trending-up" size={14} color="#059669" />
                        <Text style={styles.summarySubtext}>5 pagos procesados · Promedio RD$ 4,926</Text>
                    </View>
                </View>
            </View>

            {/* Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Historial de pagos</Text>
                <Text style={styles.sectionSubtitle}>Últimas 5 semanas</Text>
            </View>

            {/* Payout list */}
            <View style={styles.list}>
                {payouts.map((item, index) => (
                    <PayoutCard key={item.id} item={item} index={index} />
                ))}
            </View>
        </Animated.View>
    );
};

export default PayoutHistory;

const styles = StyleSheet.create({
    summaryWrapper: {
        marginHorizontal: 20,
        marginBottom: 24,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    summaryCard: {
        borderRadius: 20,
        padding: 24,
        backgroundColor: CustomColors.backgroundDark,
        borderWidth: 1,
        borderColor: CustomColors.divider,
        borderLeftWidth: 4,
        borderLeftColor: '#059669',
    },
    summaryLabel: {
        fontSize: 10,
        color: CustomColors.textLight,
        opacity: 0.5,
        letterSpacing: 1.2,
        marginBottom: 8,
    },
    summaryAmount: {
        fontSize: 36,
        fontWeight: '800',
        color: CustomColors.textLight,
        letterSpacing: -1,
        marginBottom: 10,
    },
    summaryRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    summarySubtext: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.6,
    },
    sectionHeader: {
        marginHorizontal: 20,
        marginBottom: 14,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: CustomColors.textLight,
        marginBottom: 4,
    },
    sectionSubtitle: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.5,
    },
    list: {
        gap: 12,
        paddingHorizontal: 20,
    },
    cardWrapper: {
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 3,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: CustomColors.backgroundDark,
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    accentBar: {
        width: 4,
        alignSelf: 'stretch',
        backgroundColor: CustomColors.primary,
    },
    cardLeft: {
        flex: 1,
        padding: 16,
    },
    weekLabel: {
        fontSize: 11,
        color: CustomColors.textLight,
        opacity: 0.5,
        letterSpacing: 0.8,
        marginBottom: 4,
    },
    amount: {
        fontSize: 20,
        fontWeight: '800',
        color: CustomColors.textLight,
        marginBottom: 4,
    },
    dateText: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.5,
    },
    cardRight: {
        paddingHorizontal: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        backgroundColor: 'rgba(5,150,105,0.12)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(5,150,105,0.25)',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#059669',
    },
});
