export interface Category {
  id: number;
  name: string;
  updated_at?: number;
}

export interface ProductVariant {
  id: number;
  product_id: number;
  name: string;
  stock: number;
  price_adjustment?: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  stock: number;
  category_id: number;
  category_name?: string;
  image_url?: string;
  variants?: ProductVariant[];
  updated_at?: number;
}

export interface CartItem extends Product {
  quantity: number;
  selected_variant_id?: number;
  selected_variant_name?: string;
}

export interface Sale {
  id: number;
  total_amount: number;
  timestamp: string;
  item_count: number;
}

export interface DailyRevenue {
  date: string;
  revenue: number;
}

export interface Stats {
  revenue: number;
  salesCount: number;
  lowStockCount: number;
  recentSales: Sale[];
  dailyRevenue: DailyRevenue[];
}
