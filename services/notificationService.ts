import Toast from 'react-native-toast-message';
import { useAudioPlayer } from 'expo-audio';

// Tipos de notificaciones
export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
  WARNING = 'warning'
}

// Estructura para notificaciones pendientes
interface PendingNotification {
  type: NotificationType;
  title: string;
  message: string;
  playSound: boolean;
}

// Cola de notificaciones pendientes
let pendingNotifications: PendingNotification[] = [];

// Agregar una notificación a la cola
export function queueNotification(
  type: NotificationType,
  title: string,
  message: string,
  playSound: boolean = true
) {
  pendingNotifications.push({
    type,
    title,
    message,
    playSound
  });
}

// Verificar si hay notificaciones pendientes
export function checkPendingNotifications(): PendingNotification | null {
  if (pendingNotifications.length > 0) {
    return pendingNotifications.shift() || null;
  }
  return null;
}

// Función para mostrar el toast directamente
export function showToast(type: NotificationType, title: string, message: string) {
  Toast.show({
    type: type,
    text1: title,
    text2: message,
    position: 'top',
    visibilityTime: 4000,
    autoHide: true,
    topOffset: 60
  });
}