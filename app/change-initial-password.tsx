import React, { useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import { authService } from '@/services/authService';
import { router, Stack } from 'expo-router';

export default function ChangeInitialPasswordScreen() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmNewPassword, setConfirmNewPassword] = useState('');
    const [showCurrent, setShowCurrent] = useState(false);
    const [showNew, setShowNew] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const passwordRegex = /(?:(?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/;

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            Alert.alert('Error', 'Por favor completa todos los campos');
            return;
        }
        if (newPassword.length < 6) {
            Alert.alert('Error', 'La nueva contraseña debe tener al menos 6 caracteres');
            return;
        }
        if (!passwordRegex.test(newPassword)) {
            Alert.alert('Error', 'La contraseña debe tener al menos una mayúscula, una minúscula y un número');
            return;
        }
        if (newPassword !== confirmNewPassword) {
            Alert.alert('Error', 'La nueva contraseña y la confirmación no coinciden');
            return;
        }
        if (currentPassword === newPassword) {
            Alert.alert('Error', 'La nueva contraseña debe ser diferente a la actual');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.changeInitialPassword(currentPassword, newPassword, confirmNewPassword);
            if (result.success) {
                Alert.alert(
                    'Contraseña cambiada',
                    'Tu contraseña ha sido actualizada correctamente.',
                    [{ text: 'Continuar', onPress: () => router.replace('/(tabs)') }]
                );
            } else {
                Alert.alert('Error', result.error || 'No se pudo cambiar la contraseña. Verifica tu clave actual.');
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo cambiar la contraseña. Intenta de nuevo.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="dark" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                    <View style={styles.card}>
                        <View style={styles.iconContainer}>
                            <FontAwesome name="lock" size={40} color={CustomColors.primary} />
                        </View>
                        <Text style={styles.title}>Cambio de contraseña requerido</Text>
                        <Text style={styles.subtitle}>
                            Por seguridad, debes cambiar tu contraseña inicial antes de continuar.
                        </Text>

                        {/* Clave inicial */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Clave inicial (actual)</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!showCurrent}
                                    placeholder="Ingresa tu clave actual"
                                    placeholderTextColor="#aaa"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                                    <FontAwesome name={showCurrent ? 'eye' : 'eye-slash'} size={18} color="#888" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Nueva contraseña */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Nueva contraseña</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNew}
                                    placeholder="Mínimo 6 caracteres, mayúscula y número"
                                    placeholderTextColor="#aaa"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                                    <FontAwesome name={showNew ? 'eye' : 'eye-slash'} size={18} color="#888" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirmar nueva contraseña */}
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Confirmar nueva contraseña</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={confirmNewPassword}
                                    onChangeText={setConfirmNewPassword}
                                    secureTextEntry={!showConfirm}
                                    placeholder="Repite tu nueva contraseña"
                                    placeholderTextColor="#aaa"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                                    <FontAwesome name={showConfirm ? 'eye' : 'eye-slash'} size={18} color="#888" />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.buttonText}>Cambiar contraseña</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f6fa' },
    keyboardView: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    iconContainer: { alignItems: 'center', marginBottom: 16 },
    title: { fontSize: 20, fontWeight: '700', textAlign: 'center', marginBottom: 8, color: '#1a1a2e' },
    subtitle: { fontSize: 14, textAlign: 'center', color: '#666', marginBottom: 24, lineHeight: 20 },
    inputGroup: { marginBottom: 16 },
    label: { fontSize: 13, fontWeight: '600', color: '#444', marginBottom: 6 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        backgroundColor: '#fafafa',
    },
    input: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#333' },
    eyeBtn: { padding: 12 },
    button: {
        backgroundColor: CustomColors.primary,
        borderRadius: 8,
        paddingVertical: 14,
        alignItems: 'center',
        marginTop: 8,
    },
    buttonDisabled: { opacity: 0.6 },
    buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
