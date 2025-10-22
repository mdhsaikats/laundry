-- Laundry Application Database Schema
-- MySQL compatible

-- Create database (run this first if needed)
-- CREATE DATABASE IF NOT EXISTS laundry CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
-- USE laundry;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    address TEXT,
    role VARCHAR(20) DEFAULT 'customer' NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_email (email),
    INDEX idx_users_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Laundry items table
CREATE TABLE IF NOT EXISTS laundry_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL DEFAULT 'Regular',
    base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
    image_url VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Services table
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price_multiplier DECIMAL(5, 2) NOT NULL DEFAULT 1.0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    pickup_address TEXT,
    delivery_address TEXT,
    pickup_date TIMESTAMP NULL,
    delivery_date TIMESTAMP NULL,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_orders_user_id (user_id),
    INDEX idx_orders_status (status),
    INDEX idx_orders_created_at (created_at),
    INDEX idx_orders_user_status (user_id, status),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    laundry_item_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    services TEXT NOT NULL, -- JSON array of service IDs
    item_total DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_items_order_id (order_id),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (laundry_item_id) REFERENCES laundry_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default laundry items (ignore duplicates)
INSERT IGNORE INTO laundry_items (name, category, base_price) VALUES
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
    ('Towel', 'Regular', 2.00);

-- Insert default services (ignore duplicates)
INSERT IGNORE INTO services (name, price_multiplier, description) VALUES
    ('Wash', 1.0, 'Standard washing service'),
    ('Dry Clean', 2.0, 'Professional dry cleaning'),
    ('Iron', 0.5, 'Professional ironing and pressing'),
    ('Wash + Iron', 1.3, 'Washing with ironing'),
    ('Dry Clean + Iron', 2.3, 'Dry cleaning with ironing');

-- Order status history table for tracking status changes
CREATE TABLE IF NOT EXISTS order_status_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    order_id INT NOT NULL,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by INT,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    INDEX idx_order_status_history_order_id (order_id),
    INDEX idx_order_status_history_changed_at (changed_at),
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create default admin user (password: admin123 - CHANGE IN PRODUCTION!)
-- Password hash for 'admin123' using bcrypt cost 10
INSERT IGNORE INTO users (email, password_hash, full_name, role) VALUES
    ('admin@laundrypro.com', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'Admin User', 'admin');
