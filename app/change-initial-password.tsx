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
import { useAuth } from '@/context/AuthContext';

export default function ChangeInitialPasswordScreen() {
    const { refreshUser } = useAuth();
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
                await refreshUser();
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
        <SafeAreaView style={styles.safeArea}>
            <Stack.Screen options={{ headerShown: false }} />
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.inner} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <FontAwesome
                            name="lock"
                            size={40}
                            color={CustomColors.primary}
                            style={styles.icon}
                        />
                        <Text style={styles.title}>Cambio de contraseña requerido</Text>
                        <Text style={styles.subtitle}>
                            Por seguridad, debes cambiar tu contraseña inicial antes de continuar.
                        </Text>
                    </View>

                    <View style={styles.formContainer}>
                        {/* Clave inicial */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Clave inicial (actual)</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={currentPassword}
                                    onChangeText={setCurrentPassword}
                                    secureTextEntry={!showCurrent}
                                    placeholder="Ingresa tu clave actual"
                                    placeholderTextColor={CustomColors.neutralLight}
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={styles.eyeBtn}>
                                    <FontAwesome name={showCurrent ? 'eye' : 'eye-slash'} size={18} color={CustomColors.neutralLight} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Nueva contraseña */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Nueva contraseña</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    secureTextEntry={!showNew}
                                    placeholder="Mínimo 6 caracteres, mayúscula y número"
                                    placeholderTextColor={CustomColors.neutralLight}
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowNew(!showNew)} style={styles.eyeBtn}>
                                    <FontAwesome name={showNew ? 'eye' : 'eye-slash'} size={18} color={CustomColors.neutralLight} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Confirmar nueva contraseña */}
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Confirmar nueva contraseña</Text>
                            <View style={styles.inputRow}>
                                <TextInput
                                    style={styles.input}
                                    value={confirmNewPassword}
                                    onChangeText={setConfirmNewPassword}
                                    secureTextEntry={!showConfirm}
                                    placeholder="Repite tu nueva contraseña"
                                    placeholderTextColor={CustomColors.neutralLight}
                                    autoCapitalize="none"
                                    editable={!isLoading}
                                />
                                <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={styles.eyeBtn}>
                                    <FontAwesome name={showConfirm ? 'eye' : 'eye-slash'} size={18} color={CustomColors.neutralLight} />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={[styles.button, isLoading && styles.buttonDisabled]}
                            onPress={handleChangePassword}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Cambiar contraseña</Text>
                            )}
                        </TouchableOpacity>
                    </View>

                    <View style={styles.infoBox}>
                        <FontAwesome
                            name="info-circle"
                            size={18}
                            color={CustomColors.primary}
                            style={styles.infoIcon}
                        />
                        <Text style={styles.infoText}>
                            Elige una contraseña segura con al menos una mayúscula, una minúscula y un número. No podrás reutilizar tu contraseña inicial.
                        </Text>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: CustomColors.backgroundDarkest,
    },
    container: {
        flex: 1,
    },
    inner: {
        flexGrow: 1,
        padding: 20,
        justifyContent: 'space-between',
    },
    header: {
        alignItems: 'center',
        marginVertical: 12,
    },
    icon: {
        marginBottom: 10,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: CustomColors.textLight,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: CustomColors.neutralLight,
        marginBottom: 8,
        textAlign: 'center',
        lineHeight: 20,
    },
    formContainer: {
        marginVertical: 0,
    },
    inputContainer: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: CustomColors.textLight,
        marginBottom: 8,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: CustomColors.border,
        borderRadius: 8,
        backgroundColor: CustomColors.inputBackground,
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 15,
        color: CustomColors.textLight,
    },
    eyeBtn: {
        padding: 12,
    },
    button: {
        backgroundColor: CustomColors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 10,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: CustomColors.backgroundMedium,
        borderLeftWidth: 4,
        borderLeftColor: CustomColors.primary,
        padding: 12,
        borderRadius: 6,
        marginBottom: 8,
    },
    infoIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    infoText: {
        flex: 1,
        fontSize: 12,
        color: CustomColors.textLight,
        lineHeight: 18,
    },
});
