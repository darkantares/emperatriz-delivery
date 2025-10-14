import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { CustomColors } from '@/constants/CustomColors';
import { SocketStatusIndicator } from '@/components/socketstatusindicator';

interface AppHeaderProps {
  onMenuPress?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({ 
  onMenuPress = () => console.log('Menú presionado')
}) => {
  return (
    <View style={styles.headerContainer}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton} 
          onPress={onMenuPress}
          activeOpacity={0.7}
        >
          <FontAwesome name="bars" size={24} color={CustomColors.textLight} />
        </TouchableOpacity>
        <SocketStatusIndicator />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    width: '100%',
    backgroundColor: CustomColors.backgroundMedium,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  menuButton: {
    padding: 8,
    zIndex: 10,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
});