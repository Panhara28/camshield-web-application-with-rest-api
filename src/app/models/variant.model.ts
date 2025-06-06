// models/variant.model.ts
export interface VariantOption {
  name: string;
  values: string[];
  id: string;
}

export interface Variant {
  size?: string;
  color?: string;
  material?: string;
  price: number;
  stock: number;
  image?: string;
  sku: string;
  [key: string]: any;
}

export interface VariantGroup {
  label: string;
  variants: Variant[];
}
