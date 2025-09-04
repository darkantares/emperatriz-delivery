import React, { useEffect } from 'react';
import { useAudioPlayer } from 'expo-audio';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { View, StyleSheet } from 'react-native';
import { checkPendingNotifications, NotificationType } from '@/services/notificationService';
import { CustomColors } from '@/constants/CustomColors';
import { FontAwesome } from '@expo/vector-icons';

// Componente para renderizar el icono según el tipo de notificación
const renderToastIcon = (type: NotificationType) => {
  let iconName: React.ComponentProps<typeof FontAwesome>['name'] = 'info-circle';
  let iconColor = CustomColors.info;

  switch (type) {
    case NotificationType.SUCCESS:
      iconName = 'check-circle';
      iconColor = CustomColors.success;
      break;
    case NotificationType.ERROR:
      iconName = 'exclamation-circle';
      iconColor = CustomColors.error;
      break;
    case NotificationType.WARNING:
      iconName = 'exclamation-triangle';
      iconColor = CustomColors.warning;
      break;
    case NotificationType.INFO:
    default:
      iconName = 'info-circle';
      iconColor = CustomColors.info;
  }

  return (
    <View style={styles.iconContainer}>
      <FontAwesome name={iconName} size={24} color={iconColor} />
    </View>
  );
};

// Configuración personalizada para el toast con claves únicas
const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.toast, { borderLeftColor: CustomColors.success }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      // Generamos un ID único basado en el timestamp
      key={`success-toast-${Date.now()}`}
      renderLeadingIcon={() => renderToastIcon(NotificationType.SUCCESS)}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[styles.toast, { borderLeftColor: CustomColors.error }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      key={`error-toast-${Date.now()}`}
      renderLeadingIcon={() => renderToastIcon(NotificationType.ERROR)}
    />
  ),
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.toast, { borderLeftColor: CustomColors.warning }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      key={`warning-toast-${Date.now()}`}
      renderLeadingIcon={() => renderToastIcon(NotificationType.WARNING)}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={[styles.toast, { borderLeftColor: CustomColors.info }]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.title}
      text2Style={styles.message}
      key={`info-toast-${Date.now()}`}
      renderLeadingIcon={() => renderToastIcon(NotificationType.INFO)}
    />
  ),
};

export const NotificationHandler: React.FC = () => {
  const audioSource = require('@/assets/sounds/ndc.mp3');
  const player = useAudioPlayer(audioSource);
  
  useEffect(() => { 
    const interval = setInterval(() => {
      const notification = checkPendingNotifications();
      if (notification) {
        // Añadimos un ID único para cada notificación
        const uniqueId = Date.now().toString();
        Toast.show({
          type: notification.type,
          text1: notification.title,
          text2: notification.message,
          position: 'top',
          visibilityTime: 3000,
          autoHide: true,
          topOffset: 50,
          props: {
            // Pasamos un ID único como prop
            toastId: uniqueId
          }
        });
        
        if (notification.playSound) {
          player.play();
        }
      }
    }, 500);
    
    return () => clearInterval(interval);
  }, [player]);
  
  return <Toast config={toastConfig} />;
};

const styles = StyleSheet.create({
  toast: {
    borderRadius: 12,
    borderLeftWidth: 6,
    marginHorizontal: 16,
    backgroundColor: CustomColors.backgroundDark, // Cambiado para mejor contraste con texto claro
    shadowColor: CustomColors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    minHeight: 70,
  },
  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: CustomColors.textLight,
  },
  message: {
    fontSize: 14,
    fontWeight: '400',
    color: CustomColors.textLight,
  },
  iconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 14,
    width: 28,
  },
});