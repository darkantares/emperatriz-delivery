import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CustomColors } from '@/constants/CustomColors';
import { TripMap } from '@/components/TripMap';

export interface TripMapModalProps {
  visible: boolean;
  onRequestClose: () => void;
  tripData: any;
  loading: boolean;
  error: any;
  deliveries: any[];
  onProgressDelivery: (delivery: any) => void;
}

export const TripMapModal: React.FC<TripMapModalProps> = ({
  visible,
  onRequestClose,
  tripData,
  loading,
  error,
  deliveries,
  onProgressDelivery,
}) => {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onRequestClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: CustomColors.backgroundDarkest }}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Ruta Optimizada</Text>
          <TouchableOpacity onPress={onRequestClose}>
            <Text style={styles.closeButton}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        <TripMap
          tripData={tripData}
          loading={loading}
          error={error}
          deliveries={deliveries}
          onProgressDelivery={onProgressDelivery}
        />
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: CustomColors.backgroundDark,
    borderBottomWidth: 1,
    borderBottomColor: CustomColors.textLight + '20',
  },
  modalTitle: {
    color: CustomColors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    color: CustomColors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
