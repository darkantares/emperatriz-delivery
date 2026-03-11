import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const monthlyData = [
    { month: 'Sep', value: 12400 },
    { month: 'Oct', value: 15800 },
    { month: 'Nov', value: 11200 },
    { month: 'Dic', value: 19600 },
    { month: 'Ene', value: 17300 },
    { month: 'Feb', value: 22180 },
];

const dailyData = [
    { day: 'Lun', value: 720 },
    { day: 'Mar', value: 950 },
    { day: 'Mié', value: 580 },
    { day: 'Jue', value: 1100 },
    { day: 'Vie', value: 1480 },
    { day: 'Sáb', value: 1020 },
    { day: 'Dom', value: 420 },
];

const MAX_MONTHLY = Math.max(...monthlyData.map((d) => d.value));
const MAX_DAILY = Math.max(...dailyData.map((d) => d.value));

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

const StatsCharts = () => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start();
    }, []);

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

                    <View style={styles.chartArea}>
                        {monthlyData.map((item, index) => (
                            <View key={index} style={styles.barGroup}>
                                <View style={styles.barContainer}>
                                    <AnimatedBar ratio={item.value / MAX_MONTHLY} delay={80 * index} color={CustomColors.primary} />
                                </View>
                                <Text style={styles.barLabel}>{item.month}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.chartFooter}>
                        <Text style={styles.footerText}>Mejor mes: Febrero · RD$ 22,180</Text>
                        <Text style={[styles.footerText, { color: '#059669' }]}>↑ 28.2%</Text>
                    </View>
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

                    <View style={styles.chartArea}>
                        {dailyData.map((item, index) => (
                            <View key={index} style={styles.barGroup}>
                                <View style={styles.barContainer}>
                                    <AnimatedBar ratio={item.value / MAX_DAILY} delay={80 * index} color="#059669" />
                                </View>
                                <Text style={styles.barLabel}>{item.day}</Text>
                            </View>
                        ))}
                    </View>

                    <View style={styles.chartFooter}>
                        <Text style={styles.footerText}>Mejor día: Viernes · RD$ 1,480</Text>
                        <Text style={[styles.footerText, { color: '#059669' }]}>↑ 45.1%</Text>
                    </View>
                </View>
            </View>
        </Animated.View>
    );
};

export default StatsCharts;

const styles = StyleSheet.create({
    chartWrapper: {
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
});
