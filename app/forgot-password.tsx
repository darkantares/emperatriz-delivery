import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    TextInput,
    Pressable,
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '@/services/authService';
import {
    getRecoveryState,
    saveRecoveryState,
    clearRecoveryState,
} from '@/utils/passwordRecovery';

async function handleCancelNavigation() {
    await clearRecoveryState();
    router.replace('/login');
}

function handleGoToLoginNavigation() {
    router.replace('/login');
}

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [step, setStep] = useState<'request' | 'login_with_temp'>('request');
    const [recoveryEmail, setRecoveryEmail] = useState<string | null>(null);

    useEffect(() => {
        getRecoveryState().then((state) => {
            if (state?.active && state.step === 'login_with_temp') {
                setStep('login_with_temp');
                setRecoveryEmail(state.email);
            }
        });
    }, []);

    useEffect(() => {
        AsyncStorage.getItem('remembered_email').then((savedEmail) => {
            if (savedEmail) setEmail(savedEmail);
        });
    }, []);

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
            await saveRecoveryState({
                active: true,
                email: email.trim().toLowerCase(),
                startedAt: Date.now(),
                step: 'login_with_temp',
            });
            setRecoveryEmail(email.trim().toLowerCase());
            setStep('login_with_temp');
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo procesar la solicitud');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = handleCancelNavigation;
    const handleGoToLogin = handleGoToLoginNavigation;

    if (step === 'login_with_temp') {
        return (
            <SafeAreaView style={styles.safeArea}>
                <Stack.Screen options={{ headerShown: false }} />
                <StatusBar style="light" />
                <ScrollView contentContainerStyle={styles.scrollView} keyboardShouldPersistTaps="handled">
                    <View style={styles.header}>
                        <FontAwesome name="envelope" size={50} color={CustomColors.secondary} style={styles.icon} />
                        <Text style={styles.title}>Revisa tu correo</Text>
                        <Text style={[styles.subtitle, { textAlign: 'center' }]}>
                            Enviamos una contraseña temporal a:
                        </Text>
                        <Text style={styles.emailHighlight}>{recoveryEmail}</Text>
                        <Text style={[styles.subtitle, { marginTop: 16, textAlign: 'center' }]}>
                            Abre tu correo, copia la contraseña temporal e inicia sesión con ella.{"\n"}Al ingresar se te pedirá que la cambies.
                        </Text>
                    </View>
                    <View style={styles.formContainer}>
                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleGoToLogin}
                        >
                            <Text style={styles.primaryButtonText}>Ir al inicio de sesión</Text>
                        </Pressable>
                        <Pressable
                            style={styles.cancelButton}
                            onPress={handleCancel}
                        >
                            <Text style={styles.cancelButtonText}>Cancelar recuperación</Text>
                        </Pressable>
                    </View>
                </ScrollView>
            </SafeAreaView>
        );
    }

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
                        <Pressable style={styles.backButton} onPress={() => router.back()}>
                            <FontAwesome name="arrow-left" size={20} color={CustomColors.textLight} />
                        </Pressable>
                        <FontAwesome name="lock" size={50} color={CustomColors.secondary} style={styles.icon} />
                        <Text style={styles.title}>Recuperar contraseña</Text>
                        <Text style={styles.subtitle}>Ingresa tu correo y te enviaremos una contraseña temporal</Text>
                    </View>

                    {/* Form */}
                    <View style={styles.formContainer}>
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

                        <Pressable
                            style={styles.primaryButton}
                            onPress={handleSendEmail}
                            disabled={isLoading}
                        >
                            {isLoading
                                ? <ActivityIndicator color={CustomColors.textLight} />
                                : <Text style={styles.primaryButtonText}>Enviar contraseña temporal</Text>
                            }
                        </Pressable>
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
    cancelButton: {
        borderRadius: 8,
        height: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: CustomColors.neutralLight,
    },
    cancelButtonText: {
        color: CustomColors.neutralLight,
        fontSize: 16,
    },
    emailHighlight: {
        fontSize: 15,
        fontWeight: 'bold',
        color: CustomColors.secondary,
        textAlign: 'center',
        marginTop: 6,
    },
});
