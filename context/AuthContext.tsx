import React, { createContext, useContext, useState, useEffect } from 'react';

import { IUserEntity, IRolesAllowedEntity } from '@/interfaces/auth';
import { authService } from '@/services/authService';
import { socketService } from '@/services/websocketService';
import { courierLocationTracking } from '@/services/courierLocationService';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: IUserEntity | null;
  roles: IRolesAllowedEntity[] | null;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  hasPermission: (role: string) => boolean;
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
  const [roles, setRoles] = useState<IRolesAllowedEntity[] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar autenticación al inicio
  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      try {
        const isAuth = await authService.isAuthenticated();
        setIsAuthenticated(isAuth);

        if (isAuth) {
          // Obtener datos de autenticación guardados
          const authData = await authService.getAuthData();
          
          if (authData.user) {
            setUser(authData.user);
            setRoles(authData.roles || []);
          }
        }
      } catch (error) {
        console.log('Error checking authentication:', error);
        setIsAuthenticated(false);
        setUser(null);
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
            } catch (error) {
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
      setRoles(result.data.roles);

      return { success: true };
    } catch (error) {
      console.log('Login error:', error);
      return { 
        success: false, 
        message: 'Error de conexión',
        details: error instanceof Error ? { message: error.message } : undefined
      };
    }
  };

  const logout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
    setUser(null);
    setRoles(null);
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        roles,
        login,
        logout,
        hasPermission,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
