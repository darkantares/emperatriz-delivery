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
import { router, Stack } from 'expo-router';
import { authService } from '@/services/authService';

type Step = 'request' | 'reset';

export default function ForgotPasswordScreen() {
    const [step, setStep] = useState<Step>('request');
    const [email, setEmail] = useState('');
    const [token, setToken] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleSendEmail = async () => {
        if (!email.trim()) {
            Alert.alert('Error', 'Por favor ingresa tu correo electrónico');
            return;
        }
        setIsLoading(true);
        try {
            const result = await authService.sendForgotPassword(email.trim().toLowerCase());
            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo procesar la solicitud');
                return;
            }
            Alert.alert(
                'Correo enviado',
                'Si el correo existe recibirás un enlace para restablecer tu contraseña. Copia el token del enlace y pégalo en el siguiente paso.',
            );
            setStep('reset');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!token.trim()) {
            Alert.alert('Error', 'Por favor ingresa el token recibido por correo');
            return;
        }
        if (password.length < 8) {
            Alert.alert('Error', 'La contraseña debe tener al menos 8 caracteres');
            return;
        }
        if (password !== confirmPassword) {
            Alert.alert('Error', 'Las contraseñas no coinciden');
            return;
        }
        setIsLoading(true);
        try {
            const result = await authService.resetPassword(token.trim(), password, confirmPassword);
            if (!result.success) {
                Alert.alert('Error', result.error || 'No se pudo restablecer la contraseña');
                return;
            }
            Alert.alert(
                '¡Éxito!',
                'Tu contraseña fue restablecida correctamente.',
                [{ text: 'Iniciar sesión', onPress: () => router.replace('/login') }]
            );
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo restablecer la contraseña');
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
                <ScrollView contentContainerStyle={styles.scrollView} keyboardShouldPersistTaps="handled">
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                            <FontAwesome name="arrow-left" size={20} color={CustomColors.textLight} />
                        </TouchableOpacity>
                        <FontAwesome name="lock" size={50} color={CustomColors.secondary} style={styles.icon} />
                        <Text style={styles.title}>
                            {step === 'request' ? 'Recuperar contraseña' : 'Nueva contraseña'}
                        </Text>
                        <Text style={styles.subtitle}>
                            {step === 'request'
                                ? 'Ingresa tu correo para recibir un enlace de recuperación'
                                : 'Ingresa el token recibido y tu nueva contraseña'}
                        </Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
                        {step === 'request' ? (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Correo electrónico</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Ingresa tu correo"
                                        placeholderTextColor={CustomColors.neutralLight}
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!isLoading}
                                    />
                                </View>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={handleSendEmail}
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? <ActivityIndicator color={CustomColors.textLight} />
                                        : <Text style={styles.primaryButtonText}>Enviar enlace</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.linkButton} onPress={() => setStep('reset')}>
                                    <Text style={styles.linkText}>Ya tengo un token</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Token del correo</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="Pega el token aquí"
                                        placeholderTextColor={CustomColors.neutralLight}
                                        value={token}
                                        onChangeText={setToken}
                                        autoCapitalize="none"
                                        editable={!isLoading}
                                    />
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Nueva contraseña</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Mínimo 8 caracteres"
                                            placeholderTextColor={CustomColors.neutralLight}
                                            value={password}
                                            onChangeText={setPassword}
                                            secureTextEntry={!showPassword}
                                            editable={!isLoading}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowPassword(!showPassword)}
                                        >
                                            <FontAwesome
                                                name={showPassword ? 'eye' : 'eye-slash'}
                                                size={20}
                                                color={CustomColors.neutralLight}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.inputContainer}>
                                    <Text style={styles.label}>Confirmar contraseña</Text>
                                    <View style={styles.passwordContainer}>
                                        <TextInput
                                            style={styles.passwordInput}
                                            placeholder="Repite la contraseña"
                                            placeholderTextColor={CustomColors.neutralLight}
                                            value={confirmPassword}
                                            onChangeText={setConfirmPassword}
                                            secureTextEntry={!showConfirm}
                                            editable={!isLoading}
                                        />
                                        <TouchableOpacity
                                            style={styles.eyeIcon}
                                            onPress={() => setShowConfirm(!showConfirm)}
                                        >
                                            <FontAwesome
                                                name={showConfirm ? 'eye' : 'eye-slash'}
                                                size={20}
                                                color={CustomColors.neutralLight}
                                            />
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={handleResetPassword}
                                    disabled={isLoading}
                                >
                                    {isLoading
                                        ? <ActivityIndicator color={CustomColors.textLight} />
                                        : <Text style={styles.primaryButtonText}>Restablecer contraseña</Text>
                                    }
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.linkButton} onPress={() => setStep('request')}>
                                    <Text style={styles.linkText}>← Volver</Text>
                                </TouchableOpacity>
                            </>
                        )}
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
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: 'transparent',
        position: 'relative',
    },
    backButton: {
        position: 'absolute',
        left: 0,
        top: 0,
        padding: 8,
        backgroundColor: 'transparent',
    },
    icon: {
        marginTop: 20,
        marginBottom: 16,
    },
    title: {
        fontSize: 26,
        fontWeight: 'bold',
        color: CustomColors.secondary,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: CustomColors.neutralLight,
        textAlign: 'center',
    },
    formContainer: {
        width: '100%',
        backgroundColor: 'transparent',
    },
    inputContainer: {
        marginBottom: 20,
        backgroundColor: 'transparent',
    },
    label: {
        marginBottom: 8,
        fontSize: 16,
        fontWeight: '600',
        color: CustomColors.textLight,
    },
    input: {
        backgroundColor: CustomColors.inputBackground,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 15,
        color: CustomColors.textLight,
        borderWidth: 1,
        borderColor: CustomColors.border,
    },
    passwordContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: CustomColors.inputBackground,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: CustomColors.border,
    },
    passwordInput: {
        flex: 1,
        height: 50,
        paddingHorizontal: 15,
        color: CustomColors.textLight,
        backgroundColor: 'transparent',
    },
    eyeIcon: {
        padding: 12,
        backgroundColor: 'transparent',
    },
    primaryButton: {
        backgroundColor: CustomColors.primary,
        borderRadius: 8,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    primaryButtonText: {
        color: CustomColors.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    linkButton: {
        alignItems: 'center',
        padding: 8,
    },
    linkText: {
        color: CustomColors.neutralLight,
        fontSize: 14,
        textDecorationLine: 'underline',
    },
});
