import { useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import {
  getMessaging,
  requestPermission,
  getToken,
  onMessage,
  setBackgroundMessageHandler,
  AuthorizationStatus,
} from '@react-native-firebase/messaging';
import { api } from '@/services/api';
import { NotificationType, queueNotification } from '@/services/notificationService';

export function useFCMPushNotifications(userId: number | undefined | null) {
  const registeredRef = useRef(false);

  const registerToken = useCallback(async () => {
    if (!userId) return;
    if (registeredRef.current) return;
    if (Platform.OS !== 'android') return;

    try {
      const messaging = getMessaging();

      // 1. Request permission
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('[FCM] Permission not granted');
        return;
      }

      // 2. Get FCM token
      const token = await getToken(messaging);
      if (!token) {
        console.log('[FCM] No token obtained');
        return;
      }

      // 3. Register token with backend
      const result = await api.post('/notifications/token', { userId, token });

      if (result.error) {
        console.log('[FCM] Token registration failed:', result.error);
        return;
      }

      registeredRef.current = true;
      console.log('[FCM] Token registered for user', userId);
    } catch (err: any) {
      console.log('[FCM] Error during token registration:', err);
    }
  }, [userId]);

  useEffect(() => {
    if (!userId || Platform.OS !== 'android') return;

    registerToken();

    const messaging = getMessaging();

    // Foreground message handler
    const unsubscribeOnMessage = onMessage(messaging, async (remoteMessage) => {
      const title = remoteMessage.notification?.title ?? 'Nueva notificación';
      const body = remoteMessage.notification?.body ?? '';
      console.log('[FCM] Foreground message:', remoteMessage);
      queueNotification(NotificationType.INFO, title, body, true);
    });

    // Background / quit state handler (registered early so the OS can wake the app)
    setBackgroundMessageHandler(messaging, async (remoteMessage) => {
      console.log('[FCM] Background message:', remoteMessage);
    });

    return () => {
      unsubscribeOnMessage();
    };
  }, [userId, registerToken]);
}
