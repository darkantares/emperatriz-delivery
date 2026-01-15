import React from 'react';
import { View, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { OrderDetailEntity } from '@/interfaces/delivery/delivery';
import { PRODUCT_IMAGE_URL } from '@/services/api';

interface DeliveryProductsListProps {
  orderDetails: OrderDetailEntity[];
}

export const DeliveryProductsList: React.FC<DeliveryProductsListProps> = ({ orderDetails }) => {
  if (!orderDetails || orderDetails.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* <Text style={styles.header}>Productos</Text> */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.list}>
        {orderDetails.map((od) => {
          const product = od.product;
          const imageUri = product?.files && product.files.length > 0 ? (PRODUCT_IMAGE_URL+product.files[0].url) : undefined;

          return (
            <TouchableOpacity key={od.id} activeOpacity={0.8} style={styles.card}>
              {imageUri ? (
                <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={[styles.image, styles.imagePlaceholder]} />
              )}

              <Text style={styles.title} numberOfLines={2}>{imageUri}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
  },
  header: {
    color: CustomColors.textLight,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  list: {
    paddingLeft: 5,
    paddingRight: 10,
  },
  card: {
    width: 120,
    marginRight: 12,
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: 8,
    alignItems: 'center',
  },
  image: {
    width: 96,
    height: 96,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  imagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.4,
  },
  title: {
    color: CustomColors.textLight,
    fontSize: 13,
    marginTop: 8,
    textAlign: 'center',
  },
});

export default DeliveryProductsList;