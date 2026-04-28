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

export default function ForgotPasswordScreen() {
    const [email, setEmail] = useState('');
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
                'Si el correo existe recibirás un enlace para restablecer tu contraseña.',
                [{ text: 'Entendido', onPress: () => router.back() }],
            );
        } catch (error: any) {
            Alert.alert('Error', error?.message || 'No se pudo procesar la solicitud');
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
                        <Text style={styles.title}>Recuperar contraseña</Text>
                        <Text style={styles.subtitle}>Ingresa tu correo para recibir un enlace de recuperación</Text>
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
});
