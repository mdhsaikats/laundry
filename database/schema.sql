-- Laundry Application Database Schema
-- PostgreSQL compatible

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Laundry items table
CREATE TABLE IF NOT EXISTS laundry_items (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Regular',
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pickup_date TIMESTAMP,
    delivery_date TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    laundry_item_id INTEGER NOT NULL REFERENCES laundry_items(id),
    quantity INTEGER NOT NULL DEFAULT 1,
    services TEXT NOT NULL, -- JSON array of service IDs
    item_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

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
