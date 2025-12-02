import React from 'react';
import { View, TouchableOpacity, ActivityIndicator, SafeAreaView, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { CustomColors } from '@/constants/CustomColors';

interface AppStateScreenProps {
  type: 'loading' | 'error' | 'noDeliveries';
  error?: string;
  onRetry: () => void;
}

export const AppStateScreen: React.FC<AppStateScreenProps> = ({
  type,
  error,
  onRetry
}) => {
  const renderContent = () => {
    switch (type) {
      case 'loading':
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={CustomColors.secondary} />
            <Text style={styles.loadingText}>Cargando entregas...</Text>
          </View>
        );

      case 'error':
        return (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Error: {error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
              <Text style={styles.retryButtonText}>Reintentard</Text>
            </TouchableOpacity>
          </View>
        );

      case 'noDeliveries':
        return (
          <View style={styles.container}>
            <View style={styles.noDeliveriesContainer}>
              <Text style={styles.noDeliveriesText}>No tienes envíos asignados actualmente</Text>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        {renderContent()}
        
        {/* Botón manual para refrescar entregas solo en desarrollo */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.manualRefreshButton}
            onPress={onRetry}
          >
            <Text style={styles.manualRefreshButtonText}>Refrescar entregas</Text>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  noDeliveriesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  noDeliveriesText: {
    color: CustomColors.textLight,
    fontSize: 18,
    textAlign: 'center',
    opacity: 0.7,
    marginTop: 30,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  loadingText: {
    color: CustomColors.textLight,
    marginTop: 15,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: CustomColors.backgroundDarkest,
    padding: 20,
  },
  errorText: {
    color: CustomColors.primary,
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: CustomColors.secondary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  retryButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
  },
  manualRefreshButton: {
    backgroundColor: CustomColors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    marginVertical: 10,
    marginHorizontal: 20,
    alignItems: 'center',
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 70,
    zIndex: 99,
  },
  manualRefreshButtonText: {
    color: CustomColors.textLight,
    fontWeight: 'bold',
    fontSize: 16,
  },
});