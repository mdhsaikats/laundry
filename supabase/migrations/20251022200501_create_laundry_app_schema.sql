/*
  # Laundry App Database Schema

  ## Overview
  This migration creates the complete database structure for a laundry service application.

  ## New Tables
  
  ### 1. `profiles`
  - Stores user profile information
  - `id` (uuid, primary key, references auth.users)
  - `full_name` (text)
  - `phone` (text)
  - `address` (text)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 2. `laundry_items`
  - Defines available clothing types and their base prices
  - `id` (uuid, primary key)
  - `name` (text) - e.g., "Shirt", "Pants", "Dress"
  - `category` (text) - e.g., "Regular", "Delicate", "Heavy"
  - `base_price` (numeric) - Base price per item
  - `image_url` (text, optional)
  - `created_at` (timestamptz)

  ### 3. `services`
  - Defines available laundry services (wash, dry clean, iron)
  - `id` (uuid, primary key)
  - `name` (text) - e.g., "Wash", "Dry Clean", "Iron"
  - `price_multiplier` (numeric) - Multiplier for base price
  - `description` (text)
  - `created_at` (timestamptz)

  ### 4. `orders`
  - Stores laundry orders
  - `id` (uuid, primary key)
  - `user_id` (uuid, references profiles)
  - `status` (text) - "pending", "processing", "ready", "completed", "cancelled"
  - `total_amount` (numeric)
  - `pickup_date` (timestamptz, optional)
  - `delivery_date` (timestamptz, optional)
  - `notes` (text, optional)
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 5. `order_items`
  - Stores individual items within an order
  - `id` (uuid, primary key)
  - `order_id` (uuid, references orders)
  - `laundry_item_id` (uuid, references laundry_items)
  - `quantity` (integer)
  - `services` (jsonb) - Array of service IDs selected
  - `item_total` (numeric)
  - `created_at` (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only view and manage their own profiles and orders
  - All users can view laundry_items and services (read-only)
  - Only authenticated users can create orders

  ## Important Notes
  1. All tables use Row Level Security for data protection
  2. Services are stored as JSONB in order_items for flexibility
  3. Prices are calculated based on base_price × quantity × service_multiplier
  4. Order status workflow: pending → processing → ready → completed
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create laundry_items table
CREATE TABLE IF NOT EXISTS laundry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Regular',
  base_price numeric NOT NULL DEFAULT 0,
  image_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE laundry_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view laundry items"
  ON laundry_items FOR SELECT
  TO authenticated
  USING (true);

-- Create services table
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  price_multiplier numeric NOT NULL DEFAULT 1.0,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view services"
  ON services FOR SELECT
  TO authenticated
  USING (true);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending',
  total_amount numeric NOT NULL DEFAULT 0,
  pickup_date timestamptz,
  delivery_date timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own orders"
  ON orders FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders"
  ON orders FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders"
  ON orders FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  laundry_item_id uuid NOT NULL REFERENCES laundry_items(id),
  quantity integer NOT NULL DEFAULT 1,
  services jsonb NOT NULL DEFAULT '[]'::jsonb,
  item_total numeric NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own order items"
  ON order_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own order items"
  ON order_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Insert default laundry items
INSERT INTO laundry_items (name, category, base_price) VALUES
  ('Shirt', 'Regular', 3.00),
  ('T-Shirt', 'Regular', 2.50),
  ('Pants', 'Regular', 4.00),
  ('Jeans', 'Heavy', 5.00),
  ('Dress', 'Delicate', 8.00),
  ('Skirt', 'Regular', 4.00),
  ('Blazer', 'Delicate', 10.00),
  ('Jacket', 'Heavy', 12.00),
  ('Sweater', 'Delicate', 6.00),
  ('Coat', 'Heavy', 15.00),
  ('Bed Sheet', 'Heavy', 7.00),
  ('Towel', 'Regular', 2.00)
ON CONFLICT DO NOTHING;

-- Insert default services
INSERT INTO services (name, price_multiplier, description) VALUES
  ('Wash', 1.0, 'Standard washing service'),
  ('Dry Clean', 2.0, 'Professional dry cleaning'),
  ('Iron', 0.5, 'Professional ironing and pressing'),
  ('Wash + Iron', 1.3, 'Washing with ironing'),
  ('Dry Clean + Iron', 2.3, 'Dry cleaning with ironing')
ON CONFLICT DO NOTHING;