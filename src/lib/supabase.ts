import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type LaundryItem = {
  id: string;
  name: string;
  category: string;
  base_price: number;
  image_url: string | null;
  created_at: string;
};

export type Service = {
  id: string;
  name: string;
  price_multiplier: number;
  description: string;
  created_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  status: string;
  total_amount: number;
  pickup_date: string | null;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  laundry_item_id: string;
  quantity: number;
  services: string[];
  item_total: number;
  created_at: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
  updated_at: string;
};
