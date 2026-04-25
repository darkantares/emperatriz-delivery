import React, { createContext, useContext, useState, useEffect } from 'react';
import { useToast } from 'react-native-toast-notifications';

import { IUserEntity, IRolesAllowedEntity, DeliveryPersonEntity } from '@/interfaces/auth';
import { authService } from '@/services/authService';
import { socketService } from '@/services/websocketService';
import { courierLocationTracking } from '@/services/courierLocationService';
import { setAuthFailureHandler } from '@/services/api';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: IUserEntity | null;
  carrier: DeliveryPersonEntity | null;
  roles: IRolesAllowedEntity[] | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasPermission: (role: string) => boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<IUserEntity | null>(null);
  const [carrier, setCarrier] = useState<DeliveryPersonEntity | null>(null);
  const [roles, setRoles] = useState<IRolesAllowedEntity[] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const toast = useToast();

  // Verificar autenticación al inicio
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const isAuth = await authService.isAuthenticated();

        if (isAuth) {
          // Sincronizar usuario con backend en cada carga/recarga.
          // fetchWhoami sends both the (possibly expired) access token and the
          // refresh token; the backend TokenRefreshMiddleware transparently
          // refreshes the access token when it is expired.
          const whoami = await authService.fetchWhoami();

          if (whoami.success && whoami.data) {
            setIsAuthenticated(true);
            setUser(whoami.data.user);
            // If whoami didn't include carrier (backend relation missing), fall back to stored value
            const resolvedCarrier = whoami.data.carrier ?? (await authService.getAuthData()).carrier ?? null;
            setCarrier(resolvedCarrier);
            setRoles(whoami.data.roles || []);

            // Conectar WebSocket al inicio si el usuario ya estaba autenticado
            await socketService.connect();
          } else {
            // whoami failed — auth tokens are likely fully expired / invalid.
            // Do NOT keep the user logged-in; clear state and force re-login.
            console.log('[AuthContext] whoami falló, cerrando sesión:', whoami.error);
            await authService.logout();
            setIsAuthenticated(false);
            setUser(null);
            setCarrier(null);
            setRoles(null);
          }
        } else {
          setIsAuthenticated(false);
        }
      } catch (error:any) {
        console.log('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUser(null);
        setCarrier(null);
        setRoles(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Gestionar tracking de ubicación basado en autenticación
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('[AuthContext] Usuario autenticado, configurando location tracking');
      console.log('[AuthContext] User ID:', user.id);
      
      // Configurar el servicio con el userId
      courierLocationTracking.setUserId(user.id);
      
      // Escuchar cambios en la conexión del WebSocket
      const handleConnectionChange = async (connected: boolean) => {
        console.log('[AuthContext] WebSocket connection changed:', connected);
        
        if (connected) {
          console.log('[AuthContext] WebSocket conectado, iniciando location tracking');
          
          // Esperar un poco para asegurar que la conexión está estable
          setTimeout(async () => {
            try {
              const started = await courierLocationTracking.startTracking();
              if (started) {
                console.log('[AuthContext] ✅ Location tracking iniciado correctamente');
                
                // Verificar el estado del tracking
                const status = courierLocationTracking.getTrackingStatus();
                console.log('[AuthContext] Tracking status:', status);
              } else {
                console.warn('[AuthContext] ❌ No se pudo iniciar location tracking');
              }
            } catch (error:any) {
              console.error('[AuthContext] Error al iniciar tracking:', error);
            }
          }, 1000);
        } else {
          console.log('[AuthContext] WebSocket desconectado, pausando location tracking');
          await courierLocationTracking.stopTracking();
        }
      };

      // Registrar el listener
      socketService.onConnectionChange(handleConnectionChange);
      console.log('[AuthContext] Listener de conexión registrado');

      // Si ya está conectado, iniciar tracking inmediatamente
      const isConnected = socketService.isConnected();
      console.log('[AuthContext] WebSocket connected status:', isConnected);
      
      if (isConnected) {
        console.log('[AuthContext] WebSocket ya conectado, iniciando tracking inmediatamente');
        handleConnectionChange(true);
      }

      // Cleanup
      return () => {
        console.log('[AuthContext] Limpiando listeners y deteniendo tracking');
        socketService.offConnectionChange(handleConnectionChange);
        courierLocationTracking.stopTracking();
      };
    } else {
      // Si no está autenticado, detener tracking
      console.log('[AuthContext] Usuario no autenticado, deteniendo tracking');
      courierLocationTracking.stopTracking();
    }
  }, [isAuthenticated, user]);

  // Verifica si el usuario tiene un rol específico
  const hasPermission = (roleTitle: string): boolean => {
    if (!roles) return false;
    return roles.some(role => role.title === roleTitle);
  };

  const login = async (email: string, password: string) => {
    try {
      console.log('[AuthContext] login() iniciado');
      const result = await authService.login(email, password);
      
      if (!result.success || !result.data) {
        return { 
          success: false, 
          message: result.error || 'Error en la autenticación',
          details: result.details
        };
      }

      // Actualizar estado
      setIsAuthenticated(true);
      setUser(result.data.user);
      setCarrier(result.data.carrier || null);
      setRoles(result.data.roles || []);

      // Conectar WebSocket inmediatamente después del login
      console.log('[AuthContext] Llamando socketService.connect() desde login()...');
      const connected = await socketService.connect();
      console.log('[AuthContext] socketService.connect() retornó:', connected);

      return { success: true };
    } catch (error:any) {
      console.log('Login error:', error);
      return { 
        success: false, 
        message: 'Error de conexión',
        details: error instanceof Error ? { message: error.message } : undefined
      };
    }
  };

  const logout = async () => {
    socketService.disconnect();
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setCarrier(null);
    setRoles(null);
  };

  const refreshUser = async () => {
    const whoami = await authService.fetchWhoami();
    if (whoami.success && whoami.data) {
      setUser(whoami.data.user);
      setCarrier(whoami.data.carrier ?? null);
      setRoles(whoami.data.roles || []);
    }
  };

  useEffect(() => {
    // when the API signals authentication failure (401 + no refresh or refresh rejected)
    // we show a toast and then clear state so UI can redirect to login
    setAuthFailureHandler(async () => {
      if (toast) {
        toast.show('Tu sesión ha expirado. Por favor inicia sesión nuevamente.', {
          type: 'danger',
          duration: 4000,
        });
      }
      await authService.logout();
      setIsAuthenticated(false);
      setUser(null);
      setCarrier(null);
      setRoles(null);
    });

    return () => {
      setAuthFailureHandler(null);
    };
  }, [toast]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        carrier,
        roles,
        login,
        logout,
        hasPermission,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
