import React, { useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    Alert,
    ScrollView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useAuth } from '@/context/AuthContext';
// Define la interfaz para el resultado del login para manejar los detalles
interface LoginResult {
    success: boolean;
    message?: string;
    details?: any;
}
import { CustomColors } from '@/constants/CustomColors';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { API_URL, checkApiConnectivity } from '@/services/api';
import { FontAwesome } from '@expo/vector-icons';
import { authService } from '@/services/authService';

export default function LoginScreen() {
    const [email, setEmail] = useState('valentin.delivey@umarket.com');
    const [password, setPassword] = useState('Si22500192319.');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [apiStatus, setApiStatus] = useState<{ connected: boolean, message: string }>({
        connected: true,
        message: ''
    });  
    
    const { login: authLogin } = useAuth();
    const login = authLogin as (email: string, password: string) => Promise<LoginResult>;

    React.useEffect(() => {
        
        const checkConnection = async () => {
            await authService.logout();
            const result = await checkApiConnectivity();
            setApiStatus({
                connected: result.success,
                message: result.success ? '' : `Error de conexión: ${result.error}`
            });
        };

        checkConnection();
    }, []);

    const checkServerConnection = async () => {
        setApiStatus({
            connected: true,
            message: 'Verificando conexión...'
        });

        const result = await checkApiConnectivity();
        setApiStatus({
            connected: result.success,
            message: result.success ? '' : `Error de conexión: ${result.error}`
        });

        return result.success;
    };    
    
    const handleLogin = async () => {
        if (!email || !password) {
            Alert.alert('Error', 'Por favor ingresa tu email y contraseña');
            return;
        }

        // Primero verificamos la conexión
        setIsLoading(true);
        const isConnected = await checkServerConnection();

        if (!isConnected) {
            setIsLoading(false);
            Alert.alert(
                'Error de conexión',
                `No se pudo conectar al servidor: ${API_URL}. Verifica tu conexión a internet y que el servidor esté disponible.`
            );
            return;
        }

        try {
            const result = await login(email, password);

            if (!result.success) {
                let errorMessage = result.message || 'Credenciales incorrectas';
                
                // Intentamos extraer un mensaje más detallado si existe
                if (result.details) {
                    if (typeof result.details === 'object') {
                        // Si es un objeto, intentamos extraer el mensaje
                        if (result.details.message) {
                            errorMessage = `${errorMessage}\n\nDetalles del servidor: ${result.details.message}`;
                        } else if (result.details.error) {
                            errorMessage = `${errorMessage}\n\nError del servidor: ${result.details.error}`;
                        } else {
                            // Si no hay mensaje específico, mostramos la estructura
                            errorMessage = `${errorMessage}\n\nDetalles: ${JSON.stringify(result.details)}`;
                        }
                    } else {
                        errorMessage = `${errorMessage}\n\nDetalles: ${result.details}`;
                    }
                }
                
                Alert.alert('Error de inicio de sesión', errorMessage);
            } else {
                console.log('Inicio de sesión exitoso');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            Alert.alert(
                'Error',
                `No se pudo conectar con el servidor.\nError: ${errorMessage}`
            );
            console.error('Login error:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const currentApiUrl = API_URL;
    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar style="light" />
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.container}
            >
                <ScrollView contentContainerStyle={styles.scrollView}>
                    <View style={styles.header}>
                        <Image
                            source={require('@/assets/images/splash-icon.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>Emperatriz Delivery</Text>
                        <Text style={styles.apiUrl}>
                            <Text>API: {currentApiUrl} {' '}</Text>
                            <Text style={{
                                color: apiStatus.connected ? CustomColors.success : CustomColors.error,
                                fontWeight: 'bold'
                            }}>
                                {apiStatus.connected ? '●' : '○'}
                            </Text>
                        </Text>
                        {apiStatus.message ? (
                            <TouchableOpacity onPress={checkServerConnection}>
                                <Text style={styles.apiErrorMessage}>{apiStatus.message}</Text>
                            </TouchableOpacity>
                        ) : null}
                    </View>

                    <View style={styles.formContainer}>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Ingresa tu email"
                                placeholderTextColor={CustomColors.neutralLight}
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                            />
                        </View>
                        <View style={styles.inputContainer}>
                            <Text style={styles.label}>Contraseña</Text>
                            <View style={styles.passwordContainer}>
                                <TextInput
                                    style={styles.passwordInput}
                                    placeholder="Ingresa tu contraseña"
                                    placeholderTextColor={CustomColors.neutralLight}
                                    value={password}
                                    onChangeText={setPassword}
                                    secureTextEntry={!showPassword}
                                />                
                                <TouchableOpacity
                                    style={styles.eyeIcon}
                                    onPress={() => setShowPassword(!showPassword)}
                                >
                                    <FontAwesome
                                        name={showPassword ? "eye" : "eye-slash"}
                                        size={20}
                                        color={CustomColors.neutralLight}
                                    />
                                </TouchableOpacity>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.loginButton}
                            onPress={handleLogin}
                            disabled={isLoading}
                        >              
                        {isLoading ? (
                            <ActivityIndicator color={CustomColors.textLight} />
                        ) : (
                            <Text style={styles.loginButtonText}>Iniciar Sesión</Text>
                        )}
                        </TouchableOpacity>            
                        <TouchableOpacity style={styles.forgotPassword}>
                            <Text style={styles.forgotPasswordText}>¿Olvidaste tu contraseña?</Text>
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
        justifyContent: 'center',
        padding: 20,
        backgroundColor: 'transparent',
    },
    scrollView: {
        flexGrow: 1,
        justifyContent: 'center',
        paddingVertical: 20,
    },
    header: {
        alignItems: 'center',
        marginBottom: 40,
        backgroundColor: 'transparent',
    }, apiUrl: {
        color: CustomColors.neutralLight,
        fontSize: 12,
        marginTop: 5,
        opacity: 0.7,
    },
    apiErrorMessage: {
        color: CustomColors.error,
        fontSize: 12,
        marginTop: 5,
        textAlign: 'center',
        padding: 5,
        backgroundColor: 'rgba(236, 68, 1, 0.1)',
        borderRadius: 4,
    },
    logo: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: CustomColors.secondary,
        textAlign: 'center',
        textShadowColor: 'rgba(0,0,0,0.75)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
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
    }, input: {
        backgroundColor: CustomColors.inputBackground,
        borderRadius: 8,
        height: 50,
        paddingHorizontal: 15,
        color: CustomColors.textLight,
        borderWidth: 1,
        borderColor: CustomColors.border,
    },
    passwordContainer: {
        position: 'relative',
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
        padding: 10,
        position: 'absolute',
        right: 5,
        height: '100%',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    loginButton: {
        backgroundColor: CustomColors.primary,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 10,
        shadowColor: CustomColors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    loginButtonText: {
        color: CustomColors.textLight,
        fontSize: 16,
        fontWeight: 'bold',
    },
    forgotPassword: {
        alignItems: 'center',
        marginTop: 20,
        backgroundColor: 'transparent',
    },
    forgotPasswordText: {
        color: CustomColors.secondary,
        fontSize: 14,
    },
});
