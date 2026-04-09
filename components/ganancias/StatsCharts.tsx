import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';
import { MonthlyStatItem, WeeklyStatItem } from '@/core/actions/ganancias-actions';

const formatDOP = (value: number) =>
    value.toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 });

const AnimatedBar = ({ ratio, delay, color }: { ratio: number; delay: number; color: string }) => {
    const heightAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.sequence([
            Animated.delay(delay),
            Animated.timing(heightAnim, { toValue: ratio, duration: 700, useNativeDriver: false }),
        ]).start();
    }, []);

    const barHeight = heightAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 100],
    });

    return <Animated.View style={[styles.barFill, { height: barHeight, backgroundColor: color }]} />;
};

interface StatsChartsProps {
    monthlyStats?: MonthlyStatItem[];
    weeklyStats?: WeeklyStatItem[];
    isLoading?: boolean;
}

const StatsCharts = ({ monthlyStats = [], weeklyStats = [], isLoading = false }: StatsChartsProps) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

    const maxMonthly = monthlyStats.length > 0 ? Math.max(...monthlyStats.map((d) => d.value)) : 1;
    const maxWeekly = weeklyStats.length > 0 ? Math.max(...weeklyStats.map((d) => d.value)) : 1;
    const bestMonthItem = monthlyStats.length > 0
        ? monthlyStats.reduce((a, b) => (b.value > a.value ? b : a))
        : null;
    const bestDayItem = weeklyStats.length > 0
        ? weeklyStats.reduce((a, b) => (b.value > a.value ? b : a))
        : null;

    return (
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Monthly Chart */}
            <View style={styles.chartWrapper}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Ganancias mensuales</Text>
                            <Text style={styles.subtitle}>Últimos 6 meses</Text>
                        </View>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                            <Ionicons name="stats-chart-outline" size={20} color={CustomColors.primary} />
                        </View>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator color={CustomColors.primary} style={{ marginVertical: 16 }} />
                    ) : monthlyStats.length === 0 ? (
                        <Text style={styles.emptyText}>Sin datos mensuales</Text>
                    ) : (
                        <>
                            <View style={styles.chartArea}>
                                {monthlyStats.map((item, index) => (
                                    <View key={index} style={styles.barGroup}>
                                        <View style={styles.barContainer}>
                                            <AnimatedBar ratio={item.value / maxMonthly} delay={80 * index} color={CustomColors.primary} />
                                        </View>
                                        <Text style={styles.barLabel}>{item.month}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.chartFooter}>
                                <Text style={styles.footerText}>
                                    Mejor mes: {bestMonthItem?.month} · {formatDOP(bestMonthItem?.value ?? 0)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </View>

            {/* Daily Chart */}
            <View style={styles.chartWrapper}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <View>
                            <Text style={styles.title}>Entregas por día</Text>
                            <Text style={styles.subtitle}>Esta semana</Text>
                        </View>
                        <View style={[styles.iconCircle, { backgroundColor: 'rgba(5,150,105,0.1)' }]}>
                            <Ionicons name="calendar-outline" size={20} color="#059669" />
                        </View>
                    </View>

                    {isLoading ? (
                        <ActivityIndicator color="#059669" style={{ marginVertical: 16 }} />
                    ) : weeklyStats.length === 0 ? (
                        <Text style={styles.emptyText}>Sin datos esta semana</Text>
                    ) : (
                        <>
                            <View style={styles.chartArea}>
                                {weeklyStats.map((item, index) => (
                                    <View key={index} style={styles.barGroup}>
                                        <View style={styles.barContainer}>
                                            <AnimatedBar ratio={item.value / maxWeekly} delay={80 * index} color="#059669" />
                                        </View>
                                        <Text style={styles.barLabel}>{item.day}</Text>
                                    </View>
                                ))}
                            </View>
                            <View style={styles.chartFooter}>
                                <Text style={styles.footerText}>
                                    Mejor día: {bestDayItem?.day} · {formatDOP(bestDayItem?.value ?? 0)}
                                </Text>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </Animated.View>
    );
};

export default StatsCharts;

const styles = StyleSheet.create({
    chartWrapper: {
        marginHorizontal: 2,
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
        marginBottom: 20,
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
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: CustomColors.divider,
    },
    chartArea: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        height: 110,
        marginBottom: 12,
    },
    barGroup: {
        flex: 1,
        alignItems: 'center',
        height: '100%',
        justifyContent: 'flex-end',
    },
    barContainer: {
        width: '60%',
        height: 100,
        justifyContent: 'flex-end',
        borderRadius: 4,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.05)',
        marginBottom: 6,
    },
    barFill: {
        borderRadius: 4,
        minHeight: 4,
    },
    barLabel: {
        fontSize: 10,
        color: CustomColors.textLight,
        opacity: 0.5,
        textAlign: 'center',
    },
    chartFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: CustomColors.divider,
    },
    footerText: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.6,
    },
    emptyText: {
        fontSize: 13,
        color: CustomColors.textLight,
        opacity: 0.4,
        textAlign: 'center',
        paddingVertical: 16,
    },
});
