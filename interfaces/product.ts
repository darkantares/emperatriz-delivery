import { IGlobalEntity } from "./global";

export interface ProductEntity extends IGlobalEntity {
  id: number;
  barcode?: string | null;
  title: string;
  slug: string;
  price: number;
  wholesalePrice?: number;
  wholesaleQuantity?: number;
  sellerPrice: number;
  description: string;
  attributes: any;
  features_products?: string[];
  files?: FilesProductEntity[];
  quantity?: number | null;
  quantityNoTransaction?: number | null;
  tags?: string[];
  productType: ProductTypeEntity;
  //   productVariations?: SubProductAttributes[];
  //   published?: ProductPublishStatus;
  //   offer_promotion?: OffersPromotionEntity | null;
  //   condition?: ProductConditionEntity | null;
  //   category?: CategoryEntity | null;
  //   sub_category?: SubCategoryEntity | null;
  //   sub_sub_category?: SubSubCategoryEntity | null;
  //   brand?: BrandEntity | null;
  //   reviews?: ProductsReviewEntity[];
  //   enterprise: EnterpriseEntity;
  //   warehouse: WarehousesEntity;
  //   formarray_product_variations?: ProductVariationEntity[];
  // transactions are excluded from this lightweight interface
}
export interface ProductTypeEntity {
  id: number;
  title: ProductTypeEnum;
}

export enum ProductTypeEnum {
  PHYSICAL = 'physical',
  SERVICE = 'service',
  DIGITAL = 'digital',
}
export interface FilesProductEntity {
    id: number;
    url: string;
}