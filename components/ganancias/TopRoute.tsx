import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

const TopRoute = () => {
    return (
        <View style={styles.wrapper}>
            <View style={styles.card}>
                <View style={styles.content}>
                    <View style={styles.trophyBadge}>
                        <Ionicons name="trophy" size={28} color="#F59E0B" />
                    </View>
                    <View style={styles.info}>
                        <Text style={styles.label}>RUTA ESTRELLA</Text>
                        <Text style={styles.routeName}>Piantini → Naco</Text>
                        <Text style={styles.subtext}>12 entregas · RD$ 1,680 generado</Text>
                    </View>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>#1</Text>
                    </View>
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
