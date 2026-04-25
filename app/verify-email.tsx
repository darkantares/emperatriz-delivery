import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Alert,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { authService } from '@/services/authService';
import { FontAwesome } from '@expo/vector-icons';
import { router, Stack } from 'expo-router';
import { useAuth } from '@/context/AuthContext';

export default function VerifyEmailScreen() {
    const { refreshUser } = useAuth();
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const codeInputRef = useRef<TextInput>(null);

    // Obtener email del storage o parámetro
    useEffect(() => {
        const getEmail = async () => {
            try {
                const authData = await authService.getAuthData();
                if (authData.user?.email) {
                    setEmail(authData.user.email);
                }
            } catch (error) {
                console.log('Error getting email:', error);
            }
        };

        getEmail();
    }, []);

    // Countdown timer para resend
    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [countdown]);

    const handleVerifyCode = async () => {
        if (!code || code.length !== 6) {
            Alert.alert('Error', 'Por favor ingresa un código de 6 dígitos');
            return;
        }

        if (!email) {
            Alert.alert('Error', 'Email no disponible');
            return;
        }

        setIsLoading(true);
        try {
            const result = await authService.verifyEmailCode(email, code);

            if (result.success) {
                // Refresh AuthContext so the route guard sees isEmailVerified=true
                // and auto-redirects to change-initial-password or (tabs).
                await refreshUser();
                Alert.alert(
                    'Éxito',
                    'Tu correo ha sido verificado correctamente',
                    [{ text: 'Continuar', onPress: () => setCode('') }]
                );
            } else {
                Alert.alert('Error de verificación', result.error || 'Código inválido');
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo verificar el código. Intenta de nuevo.');
            console.log('Verify error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResendCode = async () => {
        if (!email) {
            Alert.alert('Error', 'Email no disponible');
            return;
        }

        setIsResending(true);
        try {
            const result = await authService.resendVerificationCode(email);

            if (result.success) {
                Alert.alert('Éxito', 'Código reenviado a tu correo electrónico');
                setCountdown(60); // 60 segundos de espera
                setCode('');
            } else {
                Alert.alert('Error', result.error || 'No se pudo reenviar el código');
            }
        } catch (error: any) {
            Alert.alert('Error', 'No se pudo reenviar el código. Intenta de nuevo.');
            console.log('Resend error:', error);
        } finally {
            setIsResending(false);
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
                <View style={styles.inner}>
                    <View style={styles.header}>
                        <FontAwesome
                            name="envelope-open"
                            size={40}
                            color={CustomColors.primary}
                            style={styles.icon}
                        />
                        <Text style={styles.title}>Verifica tu correo electrónico</Text>
                        <Text style={styles.subtitle}>
                            Hemos enviado un código de 6 dígitos a:
                        </Text>
                        <Text style={styles.email}>{email}</Text>
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Código de verificación</Text>
                            <TextInput
                                ref={codeInputRef}
                                style={styles.input}
                                placeholder="000000"
                                placeholderTextColor={CustomColors.neutralLight}
                                value={code}
                                onChangeText={setCode}
                                keyboardType="number-pad"
                                maxLength={6}
                                editable={!isLoading}
                                textAlign="center"
                            />
                            <Text style={styles.hint}>
                                Ingresa el código de 6 dígitos que recibiste en tu correo
                            </Text>
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.verifyButton,
                                isLoading && styles.disabledButton
                            ]}
                            onPress={handleVerifyCode}
                            disabled={isLoading || code.length !== 6}
                        >
                            {isLoading ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.buttonText}>Verificar código</Text>
                            )}
                        </TouchableOpacity>

                        <View style={styles.resendContainer}>
                            <Text style={styles.resendText}>¿No recibiste el código?</Text>
                            <TouchableOpacity
                                onPress={handleResendCode}
                                disabled={isResending || countdown > 0}
                            >
                                <Text
                                    style={[
                                        styles.resendLink,
                                        (isResending || countdown > 0) && styles.disabledText
                                    ]}
                                >
                                    {countdown > 0
                                        ? `Reenviar en ${countdown}s`
                                        : 'Reenviar código'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                            style={styles.changeEmailButton}
                            onPress={() => {
                                authService.logout();
                                router.replace('/login');
                            }}
                        >
                            <Text style={styles.changeEmailText}>Cambiar correo electrónico</Text>
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
                            El código expira en 15 minutos. Si excedes los intentos permitidos, deberás solicitar un nuevo código.
                        </Text>
                    </View>
                </View>
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
        flex: 1,
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
    },
    email: {
        fontSize: 14,
        fontWeight: '600',
        color: CustomColors.primary,
        marginTop: 8,
    },
    formContainer: {
        marginVertical: 0,
    },
    inputContainer: {
        marginBottom: 12,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: CustomColors.textLight,
        marginBottom: 12,
    },
    input: {
        borderWidth: 1,
        borderColor: CustomColors.border,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 28,
        fontWeight: 'bold',
        color: CustomColors.textLight,
        backgroundColor: CustomColors.inputBackground,
        marginBottom: 8,
    },
    hint: {
        fontSize: 12,
        color: CustomColors.neutralLight,
        marginTop: 8,
    },
    verifyButton: {
        backgroundColor: CustomColors.primary,
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        marginBottom: 10,
    },
    disabledButton: {
        opacity: 0.5,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    resendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
        paddingHorizontal: 16,
    },
    resendText: {
        fontSize: 14,
        color: CustomColors.neutralLight,
        marginRight: 4,
    },
    resendLink: {
        fontSize: 14,
        color: CustomColors.primary,
        fontWeight: '600',
    },
    disabledText: {
        opacity: 0.5,
    },
    changeEmailButton: {
        paddingVertical: 8,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: CustomColors.border,
        marginTop: 8,
    },
    changeEmailText: {
        fontSize: 14,
        color: CustomColors.primary,
        fontWeight: '500',
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
