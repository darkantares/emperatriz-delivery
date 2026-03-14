import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';
import { PaidInvoice } from '@/core/actions/ganancias-actions';

const formatDOP = (value: number) =>
    value.toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 });

const formatDate = (dateStr: string): string => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' });
};

const PayoutCard = ({ item, index }: { item: PaidInvoice; index: number }) => {
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
                    <Text style={styles.weekLabel}>{item.invoiceNumber}</Text>
                    <Text style={styles.amount}>{formatDOP(item.totalAmount)}</Text>
                    <Text style={styles.dateText}>{formatDate(item.issueDate)}</Text>
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

interface PayoutHistoryProps {
    items?: PaidInvoice[];
    isLoading?: boolean;
}

const PayoutHistory = ({ items = [], isLoading = false }: PayoutHistoryProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();
    }, []);

    const totalPaid = items.reduce((sum, i) => sum + i.totalAmount, 0);
    const avgPaid = items.length > 0 ? totalPaid / items.length : 0;

    return (
        <Animated.View style={{ opacity: fadeAnim }}>
            {/* Summary card */}
            <View style={styles.summaryWrapper}>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryLabel}>TOTAL PAGADO ({items.length} FACTURAS)</Text>
                    <Text style={styles.summaryAmount}>
                        {isLoading ? '—' : formatDOP(totalPaid)}
                    </Text>
                    <View style={styles.summaryRow}>
                        <Ionicons name="trending-up" size={14} color="#059669" />
                        <Text style={styles.summarySubtext}>
                            {items.length} pago{items.length !== 1 ? 's' : ''} procesado{items.length !== 1 ? 's' : ''}
                            {items.length > 0 ? ` · Promedio ${formatDOP(avgPaid)}` : ''}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Header */}
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Historial de pagos</Text>
                <Text style={styles.sectionSubtitle}>Facturas pagadas</Text>
            </View>

            {/* Payout list */}
            {isLoading ? (
                <ActivityIndicator color={CustomColors.primary} style={{ marginVertical: 16 }} />
            ) : items.length === 0 ? (
                <Text style={styles.emptyText}>Sin pagos registrados</Text>
            ) : (
                <View style={styles.list}>
                    {items.map((item, index) => (
                        <PayoutCard key={item.id} item={item} index={index} />
                    ))}
                </View>
            )}
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
    emptyText: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.4,
        textAlign: 'center',
        paddingVertical: 16,
        marginHorizontal: 20,
    },
});
