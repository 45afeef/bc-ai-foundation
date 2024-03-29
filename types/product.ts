export interface NewProduct {
  id: number;
  name: string;
}
export interface Product extends NewProduct {
  brand: string;
  type: string;
  condition: string;
  weight: number;
  height: number;
  width: number;
  depth: number;
  categoriesNames: string;
  videosDescriptions: string;
  imagesDescriptions: string;
  custom_fields: { name: string; value: string }[];
}

export interface MinimalProduct extends NewProduct {
  description: string;
  addToCartUrl: string;
  relatedProducts?: MinimalProduct[]
}

export interface StoreProducts {
  bestSellingProducts: MinimalProduct[],
  featuredProducts: MinimalProduct[],
  newestProducts: MinimalProduct[],
}

