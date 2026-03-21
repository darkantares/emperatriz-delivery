import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';
import { Capitalize } from '@/utils/capitalize';
import { DriverTopRoute } from '@/core/actions/ganancias-actions';

const formatDOP = (value: number) =>
    value.toLocaleString('es-DO', { style: 'currency', currency: 'DOP', maximumFractionDigits: 2 });

interface TopRouteProps {
    route?: DriverTopRoute | null;
    isLoading?: boolean;
}

const TopRoute = ({ route, isLoading = false }: TopRouteProps) => {
    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.trophyBadge}>
                        <Ionicons name="trophy" size={28} color="#F59E0B" />
                    </View>
                    {isLoading ? (
                        <ActivityIndicator color="#F59E0B" style={{ flex: 1 }} />
                    ) : route ? (
                        <View style={styles.info}>
                            <Text style={styles.label}>RUTA ESTRELLA</Text>
                            <Text style={styles.routeName} numberOfLines={2}>{Capitalize(route.routeName)}</Text>
                            <Text style={styles.subtext}>{route.deliveryCount} entrega/s </Text>
                        </View>
                    ) : (
                        <View style={styles.info}>
                            <Text style={styles.label}>RUTA ESTRELLA</Text>
                            <Text style={styles.routeName}>Sin datos aún</Text>
                            <Text style={styles.subtext}>Completa entregas para ver tu ruta estrella</Text>
                        </View>
                    )}
                    {route && (
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>#1</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

export default TopRoute;

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
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.35)',
        backgroundColor: 'rgba(245,158,11,0.08)',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    trophyBadge: {
        width: 58,
        height: 58,
        borderRadius: 16,
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    info: {
        flex: 1,
    },
    label: {
        fontSize: 10,
        color: '#F59E0B',
        letterSpacing: 1.2,
        marginBottom: 4,
        opacity: 0.85,
    },
    routeName: {
        fontSize: 18,
        fontWeight: '800',
        color: CustomColors.textLight,
        marginBottom: 3,
    },
    subtext: {
        fontSize: 12,
        color: CustomColors.textLight,
        opacity: 0.6,
    },
    badge: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(245,158,11,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245,158,11,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeText: {
        fontSize: 14,
        fontWeight: '800',
        color: '#F59E0B',
    },
});
