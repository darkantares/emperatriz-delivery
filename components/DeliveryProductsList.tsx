import React from 'react';
import {
  View,
  StyleSheet,
  Image,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Text } from '@/components/Themed';
import { CustomColors } from '@/constants/CustomColors';
import { OrderDetailEntity } from '@/interfaces/delivery/delivery';
import { PRODUCT_IMAGE_URL } from '@/services/api';
import { Capitalize } from '@/utils/capitalize';
import { ProductTypeEnum } from '@/interfaces/product';

interface DeliveryProductsListProps {
  orderDetails: OrderDetailEntity[];
}

export const DeliveryProductsList: React.FC<DeliveryProductsListProps> = ({
  orderDetails,
}) => {
  if (!orderDetails || orderDetails.length === 0) return null;
  
  // Filtrar solo productos físicos
  const physicalOrderDetails = orderDetails.filter(
    (od) => od.product?.productType?.title === ProductTypeEnum.PHYSICAL
  );
  
  if (physicalOrderDetails.length === 0) return null;
  
  console.log(orderDetails);
  
  return (
    <View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
      >
        {physicalOrderDetails.map((od) => {
          const product = od.product;
          console.log(product);
          
          const images = product.files?.filter((f) => f.url).map((f) => PRODUCT_IMAGE_URL + f.url) || [];
            
          return (
            <TouchableOpacity
              key={od.id}
              activeOpacity={0.8}
              style={styles.card}
            >
              {/* SLIDER DE IMÁGENES */}
              <View style={styles.imageContainer}>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  style={styles.slider}
                >
                  {images.length > 0 ? (
                    images.map((uri, index) => (
                      <Image
                        key={index}
                        source={{ uri }}
                        style={styles.imageFill}
                        resizeMode="cover"
                      />
                    ))
                  ) : (
                    <View
                      style={[
                        styles.imageFill,
                        styles.imagePlaceholder,
                      ]}
                    />
                  )}
                </ScrollView>
              </View>

              {/* TÍTULO */}
              <Text style={styles.title} numberOfLines={2}>
                {Capitalize(product?.title)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const CARD_WIDTH = 120;
const CARD_PADDING = 8;
const IMAGE_HEIGHT = 96;

const styles = StyleSheet.create({
  list: {
    paddingLeft: 5,
    paddingRight: 10,
  },
  card: {
    width: CARD_WIDTH,
    marginRight: 12,
    backgroundColor: CustomColors.backgroundDarkest,
    borderRadius: 8,
    padding: CARD_PADDING,
    alignItems: 'center',
  },
  imageContainer: {
    width: '100%',
    height: IMAGE_HEIGHT,
    borderRadius: 8,
    backgroundColor: '#333',
    overflow: 'hidden',
  },
  slider: {
    width: '100%',
    height: IMAGE_HEIGHT,
  },
  imageFill: {
    width: CARD_WIDTH - CARD_PADDING * 2,
    height: IMAGE_HEIGHT,
  },
  imagePlaceholder: {
    backgroundColor: '#333',
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
