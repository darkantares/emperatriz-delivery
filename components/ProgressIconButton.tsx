import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { CustomColors } from '@/constants/CustomColors';

interface ProgressIconButtonProps {
  onPress?: () => void;
  disabled?: boolean;
}

export const ProgressIconButton: React.FC<ProgressIconButtonProps> = ({ onPress, disabled }) => {
  return (
    <TouchableOpacity
      style={[styles.button, disabled && styles.disabled]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityLabel="Progresar envío"
    >
      <FontAwesome name="play" size={30} color={CustomColors.textLight} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: CustomColors.secondary,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
    marginRight: 15,
  },
  disabled: {
    backgroundColor: CustomColors.divider,
    opacity: 0.6,
  },
});
