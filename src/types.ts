export interface Website {
  id: string;
  name: string;
  url: string;
  status: 'active' | 'paused' | 'error';
  discount_threshold: number;
  scan_frequency: number; // in hours
  last_scanned_at: string | null;
  next_scan_at: string | null;
  created_at: string;
  error_message?: string | null;
  favicon?: string;
}

export interface Product {
  id: string;
  website_id: string;
  website_name: string;
  name: string;
  product_url: string;
  image_url: string;
  currency: string;
  regular_price: number; // true non-discounted regular price
  original_price: number;
  current_price: number;
  previous_price?: number;
  discount_percentage: number;
  is_verified_discount: boolean;
  availability: 'in_stock' | 'out_of_stock';
  last_seen_at: string;
  created_at: string;
}

export interface PriceHistory {
  id: string;
  product_id: string;
  regular_price: number;
  original_price: number;
  current_price: number;
  previous_price?: number;
  discount_percentage: number;
  price_change: number; // negative for price drop
  is_new_drop: boolean;
  recorded_at: string;
}

export interface Alert {
  id: string;
  product_id: string;
  website_id: string;
  website_name: string;
  product_name: string;
  product_url: string;
  image_url: string;
  currency: string;
  regular_price: number;
  original_price: number;
  sale_price: number;
  previous_price?: number;
  discount_percentage: number;
  status: 'new' | 'viewed';
  detected_at: string;
  notification_sent_at: string | null;
}

export interface AppSettings {
  default_discount_threshold: number;
  default_scan_frequency: number;
  telegram_bot_token: string;
  telegram_chat_id: string;
  notification_enabled: boolean;
  currency: string;
  auto_scan_enabled: boolean;
  scan_failure_notifications: boolean;
}

export interface DashboardStats {
  monitored_websites: number;
  products_discovered: number;
  active_alerts: number;
  last_scan: string | null;
}
