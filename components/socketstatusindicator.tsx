import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { CustomColors } from '@/constants/CustomColors';
import { socketService } from '@/services/websocketService';

export const SocketStatusIndicator: React.FC = () => {
  const [isConnected, setIsConnected] = useState<boolean>(socketService.isConnected());

  useEffect(() => {
    // Función para manejar cambios en la conexión
    const handleConnectionChange = (connected: boolean) => {
      setIsConnected(connected);
    };

    // Suscribirse a cambios en la conexión
    socketService.onConnectionChange(handleConnectionChange);

    // Limpiar al desmontar
    return () => {
      socketService.offConnectionChange(handleConnectionChange);
    };
  }, []);

  // const handleReconnect = async () => {
  //   // Intentar reconectar
  //   console.log("Intentando reconexión manual...");
    
  //   // Desconectar primero para limpiar estado
  //   socketService.disconnect();
    
  //   // Esperar un momento antes de reconectar
  //   setTimeout(async () => {
  //     await socketService.connect();
  //   }, 500);
  // };

  return (
    <View style={styles.container}>
      <View style={[styles.indicator, { backgroundColor: isConnected ? CustomColors.success : CustomColors.error }]} />
      <Text style={styles.text}>{isConnected ? 'Conectado' : 'Desconectado'}</Text>
      {/* <TouchableOpacity style={styles.retryButton} onPress={handleReconnect}>
        <Text style={styles.retryText}>Reconectar</Text>
      </TouchableOpacity> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  text: {
    fontSize: 12,
    color: CustomColors.textLight,
  },
  retryButton: {
    marginLeft: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: CustomColors.primary,
    borderRadius: 4,
  },
  retryText: {
    color: '#fff',
    fontSize: 12,
  },
});