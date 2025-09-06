import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { Capitalize } from '@/utils/capitalize';

interface GreetingProps {
  userName: string;
}

export const Greeting = ({ userName }: GreetingProps) => {
  return (
    <View style={styles.header}>
      <View>
        <Text style={styles.greeting}>Hola!</Text>
        <Text style={styles.userName}>{Capitalize(userName)}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
    paddingTop: 32,
    paddingHorizontal: 16,
  },
  greeting: {
    fontSize: 16,
    color: CustomColors.textLight,
    opacity: 0.8,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: CustomColors.textLight,
  },
});
