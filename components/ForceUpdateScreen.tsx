import React from 'react';
import { View, Text, ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { CustomColors } from '@/constants/CustomColors';

type UpdateStatus = 'idle' | 'checking' | 'downloading' | 'updated' | 'error';

interface ForceUpdateScreenProps {
  status: UpdateStatus;
  onRetry: () => void;
}

export default function ForceUpdateScreen({ status, onRetry }: ForceUpdateScreenProps) {
  const isLoading = status === 'checking' || status === 'downloading';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Actualización requerida</Text>
      <Text style={styles.message}>
        Hay una nueva versión disponible. Por favor espera mientras se instala automáticamente.
      </Text>

      {isLoading && <ActivityIndicator size="large" color={CustomColors.textLight} style={styles.spinner} />}

      {status === 'error' && (
        <>
          <Text style={styles.errorText}>
            No se pudo descargar la actualización. Verifica tu conexión a internet.
          </Text>
          <Pressable style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </Pressable>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: CustomColors.backgroundDarkest,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: CustomColors.textLight,
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: CustomColors.neutralLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  spinner: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: CustomColors.error,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: CustomColors.quaternary,
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: CustomColors.textLight,
    fontSize: 16,
    fontWeight: '600',
  },
});
