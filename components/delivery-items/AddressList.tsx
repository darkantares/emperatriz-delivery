import React from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { AddressItem, AddressListItem } from './AddressListItem';
import { CustomColors } from '@/constants/CustomColors';


interface AddressListProps {
  addresses: AddressItem[];
  onEditAddress: (id: string) => void;
  onDeleteAddress: (id: string) => void;
  onStatusUpdate?: (id: string, newStatus: string) => void;
}

export const AddressList: React.FC<AddressListProps> = ({
  addresses,
  onStatusUpdate,
}) => {
  const renderItem = ({ item }: { item: AddressItem }) => (
    <AddressListItem
      item={item}
      onStatusUpdate={onStatusUpdate}
    />
  );
  return addresses.length > 0 ? (
    <FlatList
      data={addresses}
      renderItem={renderItem}
      keyExtractor={item => item.id}
      style={styles.list}
    />
  ) : (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No hay direcciones seleccionadas</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  list: {
    width: '100%',
    backgroundColor: CustomColors.backgroundDarkest,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    backgroundColor: CustomColors.backgroundDarkest,
  },
  emptyText: {
    fontSize: 16,
    color: CustomColors.textLight,
    opacity: 0.7,
    backgroundColor: CustomColors.backgroundDark,
    padding: 15,
    borderRadius: 8,
  },
});
