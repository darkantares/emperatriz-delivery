import React from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

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

      {isLoading && <ActivityIndicator size="large" color="#ffffff" style={styles.spinner} />}

      {status === 'error' && (
        <>
          <Text style={styles.errorText}>
            No se pudo descargar la actualización. Verifica tu conexión a internet.
          </Text>
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1A1125',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  spinner: {
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#7B2FBE',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
