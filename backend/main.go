package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	_ "github.com/go-sql-driver/mysql"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Database connection
var db *sql.DB

// JWT secret key
var jwtSecret = []byte(os.Getenv("JWT_SECRET"))

// Models
type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Phone     string    `json:"phone,omitempty"`
	Address   string    `json:"address,omitempty"`
	Role      string    `json:"role"`
	IsActive  bool      `json:"is_active"`
	CreatedAt time.Time `json:"created_at"`
}

type LaundryItem struct {
	ID        int     `json:"id"`
	Name      string  `json:"name"`
	Category  string  `json:"category"`
	BasePrice float64 `json:"base_price"`
	ImageURL  string  `json:"image_url,omitempty"`
}

type Service struct {
	ID              int     `json:"id"`
	Name            string  `json:"name"`
	PriceMultiplier float64 `json:"price_multiplier"`
	Description     string  `json:"description"`
}

type Order struct {
	ID              int         `json:"id"`
	UserID          int         `json:"user_id"`
	Status          string      `json:"status"`
	TotalAmount     float64     `json:"total_amount"`
	PickupAddress   string      `json:"pickup_address,omitempty"`
	DeliveryAddress string      `json:"delivery_address,omitempty"`
	Notes           string      `json:"notes,omitempty"`
	CreatedAt       time.Time   `json:"created_at"`
	Items           []OrderItem `json:"items,omitempty"`
}

type OrderItem struct {
	ID            int     `json:"id"`
	OrderID       int     `json:"order_id"`
	LaundryItemID int     `json:"laundry_item_id"`
	ItemName      string  `json:"item_name,omitempty"`
	Quantity      int     `json:"quantity"`
	Services      string  `json:"services"`
	ItemTotal     float64 `json:"item_total"`
}

type Claims struct {
	UserID int    `json:"user_id"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// Request/Response structs
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
	Phone    string `json:"phone"`
	Address  string `json:"address"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateOrderRequest struct {
	TotalAmount     float64              `json:"total_amount"`
	PickupAddress   string               `json:"pickup_address"`
	DeliveryAddress string               `json:"delivery_address"`
	Notes           string               `json:"notes"`
	Items           []CreateOrderItemReq `json:"items"`
}

type CreateOrderItemReq struct {
	LaundryItemID int     `json:"laundry_item_id"`
	Quantity      int     `json:"quantity"`
	Services      []int   `json:"services"`
	ItemTotal     float64 `json:"item_total"`
}

func main() {
	// Initialize database
	initDB()
	defer db.Close()

	// Set JWT secret
	if len(jwtSecret) == 0 {
		jwtSecret = []byte("your-secret-key-change-in-production")
	}

	// Create router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:*", "http://127.0.0.1:*"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Routes
	r.Route("/api", func(r chi.Router) {
		// Public routes
		r.Post("/auth/register", handleRegister)
		r.Post("/auth/login", handleLogin)

		// Protected routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)

			// Items
			r.Get("/items", getItems)

			// Services
			r.Get("/services", getServices)

			// Orders
			r.Get("/orders", getOrders)
			r.Post("/orders", createOrder)
		})

		// Admin routes
		r.Group(func(r chi.Router) {
			r.Use(authMiddleware)
			r.Use(adminMiddleware)

			// Admin Orders Management
			r.Get("/admin/orders", getAllOrders)
			r.Get("/admin/orders/search", searchOrders)
			r.Put("/admin/orders/{orderID}/status", updateOrderStatus)
			r.Get("/admin/stats", getAdminStats)
		})
	})

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := http.ListenAndServe(":"+port, r); err != nil {
		log.Fatal(err)
	}
}

// Initialize database connection
func initDB() {
	dbHost := getEnv("DB_HOST", "localhost")
	dbPort := getEnv("DB_PORT", "3306")
	dbUser := getEnv("DB_USER", "root")
	dbPassword := getEnv("DB_PASSWORD", "2911")
	dbName := getEnv("DB_NAME", "laundry")

	// MySQL DSN format: username:password@tcp(host:port)/dbname?parseTime=true
	connStr := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true",
		dbUser, dbPassword, dbHost, dbPort, dbName)

	var err error
	db, err = sql.Open("mysql", connStr)
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatal("Failed to ping database:", err)
	}

	log.Println("Database connected successfully")
}

// Auth middleware
func authMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		if authHeader == "" {
			respondError(w, http.StatusUnauthorized, "Authorization header required")
			return
		}

		bearerToken := strings.Split(authHeader, " ")
		if len(bearerToken) != 2 || bearerToken[0] != "Bearer" {
			respondError(w, http.StatusUnauthorized, "Invalid authorization header format")
			return
		}

		tokenString := bearerToken[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			respondError(w, http.StatusUnauthorized, "Invalid token")
			return
		}

		// Add user info to headers
		r.Header.Set("X-User-ID", strconv.Itoa(claims.UserID))
		r.Header.Set("X-User-Role", claims.Role)
		next.ServeHTTP(w, r)
	})
}

// Admin middleware - checks if user has admin role
func adminMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		role := r.Header.Get("X-User-Role")
		if role != "admin" {
			respondError(w, http.StatusForbidden, "Admin access required")
			return
		}
		next.ServeHTTP(w, r)
	})
}

// Handlers
func handleRegister(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate input
	if req.Email == "" || req.Password == "" || req.FullName == "" {
		respondError(w, http.StatusBadRequest, "Email, password, and full name are required")
		return
	}

	// Hash password
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to hash password")
		return
	}

	// Insert user
	result, err := db.Exec(
		"INSERT INTO users (email, password_hash, full_name, phone, address) VALUES (?, ?, ?, ?, ?)",
		req.Email, string(hashedPassword), req.FullName, req.Phone, req.Address,
	)

	if err != nil {
		if strings.Contains(err.Error(), "Duplicate") || strings.Contains(err.Error(), "duplicate") {
			respondError(w, http.StatusConflict, "Email already exists")
		} else {
			respondError(w, http.StatusInternalServerError, "Failed to create user")
		}
		return
	}

	// Get last insert ID
	lastID, err := result.LastInsertId()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get user ID")
		return
	}
	userID := int(lastID)

	// Get user
	user, err := getUserByID(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve user")
		return
	}

	// Generate token
	token, err := generateToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusCreated, AuthResponse{Token: token, User: *user})
}

func handleLogin(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Get user by email
	var userID int
	var passwordHash string
	err := db.QueryRow("SELECT id, password_hash FROM users WHERE email = ?", req.Email).
		Scan(&userID, &passwordHash)

	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Compare password
	if err := bcrypt.CompareHashAndPassword([]byte(passwordHash), []byte(req.Password)); err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid credentials")
		return
	}

	// Get user
	user, err := getUserByID(userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to retrieve user")
		return
	}

	// Generate token
	token, err := generateToken(user)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to generate token")
		return
	}

	respondJSON(w, http.StatusOK, AuthResponse{Token: token, User: *user})
}

func getItems(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, category, base_price, COALESCE(image_url, '') FROM laundry_items ORDER BY name")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch items")
		return
	}
	defer rows.Close()

	var items []LaundryItem
	for rows.Next() {
		var item LaundryItem
		if err := rows.Scan(&item.ID, &item.Name, &item.Category, &item.BasePrice, &item.ImageURL); err != nil {
			continue
		}
		items = append(items, item)
	}

	respondJSON(w, http.StatusOK, items)
}

func getServices(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, name, price_multiplier, description FROM services ORDER BY name")
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch services")
		return
	}
	defer rows.Close()

	var services []Service
	for rows.Next() {
		var service Service
		if err := rows.Scan(&service.ID, &service.Name, &service.PriceMultiplier, &service.Description); err != nil {
			continue
		}
		services = append(services, service)
	}

	respondJSON(w, http.StatusOK, services)
}

func getOrders(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.Header.Get("X-User-ID"))
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid user")
		return
	}

	rows, err := db.Query(`
		SELECT id, user_id, status, total_amount, 
		       COALESCE(pickup_address, ''), COALESCE(delivery_address, ''), 
		       COALESCE(notes, ''), created_at 
		FROM orders 
		WHERE user_id = ? 
		ORDER BY created_at DESC
	`, userID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch orders")
		return
	}
	defer rows.Close()

	var orders []Order
	for rows.Next() {
		var order Order
		if err := rows.Scan(&order.ID, &order.UserID, &order.Status, &order.TotalAmount,
			&order.PickupAddress, &order.DeliveryAddress, &order.Notes, &order.CreatedAt); err != nil {
			continue
		}

		// Get order items
		itemRows, err := db.Query(`
			SELECT oi.id, oi.order_id, oi.laundry_item_id, li.name, oi.quantity, oi.services, oi.item_total
			FROM order_items oi
			JOIN laundry_items li ON oi.laundry_item_id = li.id
			WHERE oi.order_id = ?
		`, order.ID)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var item OrderItem
				if err := itemRows.Scan(&item.ID, &item.OrderID, &item.LaundryItemID, &item.ItemName, &item.Quantity, &item.Services, &item.ItemTotal); err == nil {
					order.Items = append(order.Items, item)
				}
			}
		}

		orders = append(orders, order)
	}

	respondJSON(w, http.StatusOK, orders)
}

// Admin: Get All Orders
func getAllOrders(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT o.id, o.user_id, o.status, o.total_amount, 
		       COALESCE(o.pickup_address, ''), COALESCE(o.delivery_address, ''),
		       COALESCE(o.notes, ''), o.created_at,
		       u.full_name, u.email, COALESCE(u.phone, ''), COALESCE(u.address, '')
		FROM orders o
		JOIN users u ON o.user_id = u.id
		ORDER BY o.created_at DESC
	`)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to fetch orders")
		return
	}
	defer rows.Close()

	type AdminOrder struct {
		Order
		CustomerName    string `json:"customer_name"`
		CustomerEmail   string `json:"customer_email"`
		CustomerPhone   string `json:"customer_phone,omitempty"`
		CustomerAddress string `json:"customer_address,omitempty"`
	}

	var orders []AdminOrder
	for rows.Next() {
		var order AdminOrder
		if err := rows.Scan(&order.ID, &order.UserID, &order.Status, &order.TotalAmount,
			&order.PickupAddress, &order.DeliveryAddress, &order.Notes, &order.CreatedAt,
			&order.CustomerName, &order.CustomerEmail, &order.CustomerPhone, &order.CustomerAddress); err != nil {
			continue
		}

		// Get order items
		itemRows, err := db.Query(`
			SELECT oi.id, oi.order_id, oi.laundry_item_id, li.name, oi.quantity, oi.services, oi.item_total
			FROM order_items oi
			JOIN laundry_items li ON oi.laundry_item_id = li.id
			WHERE oi.order_id = ?
		`, order.ID)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var item OrderItem
				if err := itemRows.Scan(&item.ID, &item.OrderID, &item.LaundryItemID, &item.ItemName, &item.Quantity, &item.Services, &item.ItemTotal); err == nil {
					order.Items = append(order.Items, item)
				}
			}
		}

		orders = append(orders, order)
	}

	respondJSON(w, http.StatusOK, orders)
}

// Admin: Update Order Status
func updateOrderStatus(w http.ResponseWriter, r *http.Request) {
	orderID := chi.URLParam(r, "orderID")
	userID, _ := strconv.Atoi(r.Header.Get("X-User-ID"))

	var req struct {
		Status string `json:"status"`
		Notes  string `json:"notes"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Validate status
	validStatuses := []string{"pending", "processing", "ready", "delivered", "cancelled"}
	isValid := false
	for _, s := range validStatuses {
		if req.Status == s {
			isValid = true
			break
		}
	}
	if !isValid {
		respondError(w, http.StatusBadRequest, "Invalid status")
		return
	}

	// Get current status for history
	var oldStatus string
	err := db.QueryRow("SELECT status FROM orders WHERE id = ?", orderID).Scan(&oldStatus)
	if err != nil {
		respondError(w, http.StatusNotFound, "Order not found")
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update order status")
		return
	}
	defer tx.Rollback()

	// Update order status
	_, err = tx.Exec("UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?", req.Status, orderID)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to update order status")
		return
	}

	// Record status change in history
	_, err = tx.Exec(`
		INSERT INTO order_status_history (order_id, old_status, new_status, changed_by, notes)
		VALUES (?, ?, ?, ?, ?)
	`, orderID, oldStatus, req.Status, userID, req.Notes)
	if err != nil {
		log.Printf("Failed to record status history: %v", err)
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit order status update")
		return
	}

	respondJSON(w, http.StatusOK, map[string]string{
		"message": "Order status updated successfully",
		"status":  req.Status,
	})
}

// Admin: Search Orders
func searchOrders(w http.ResponseWriter, r *http.Request) {
	searchTerm := r.URL.Query().Get("q")
	status := r.URL.Query().Get("status")
	startDate := r.URL.Query().Get("start_date")
	endDate := r.URL.Query().Get("end_date")

	query := `
		SELECT o.id, o.user_id, o.status, o.total_amount, 
		       COALESCE(o.pickup_address, ''), COALESCE(o.delivery_address, ''),
		       COALESCE(o.notes, ''), o.created_at,
		       u.full_name, u.email, COALESCE(u.phone, ''), COALESCE(u.address, '')
		FROM orders o
		JOIN users u ON o.user_id = u.id
		WHERE 1=1
	`

	args := []interface{}{}

	if searchTerm != "" {
		query += ` AND (u.full_name LIKE ? OR u.email LIKE ? OR o.id = ?)`
		searchPattern := "%" + searchTerm + "%"
		args = append(args, searchPattern, searchPattern, searchTerm)
	}

	if status != "" && status != "all" {
		query += ` AND o.status = ?`
		args = append(args, status)
	}

	if startDate != "" {
		query += ` AND o.created_at >= ?`
		args = append(args, startDate)
	}

	if endDate != "" {
		query += ` AND o.created_at <= ?`
		args = append(args, endDate)
	}

	query += ` ORDER BY o.created_at DESC LIMIT 100`

	rows, err := db.Query(query, args...)
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to search orders")
		return
	}
	defer rows.Close()

	type AdminOrder struct {
		Order
		CustomerName    string `json:"customer_name"`
		CustomerEmail   string `json:"customer_email"`
		CustomerPhone   string `json:"customer_phone,omitempty"`
		CustomerAddress string `json:"customer_address,omitempty"`
	}

	var orders []AdminOrder
	for rows.Next() {
		var order AdminOrder
		if err := rows.Scan(&order.ID, &order.UserID, &order.Status, &order.TotalAmount,
			&order.PickupAddress, &order.DeliveryAddress, &order.Notes, &order.CreatedAt,
			&order.CustomerName, &order.CustomerEmail, &order.CustomerPhone, &order.CustomerAddress); err != nil {
			continue
		}

		// Get order items
		itemRows, err := db.Query(`
			SELECT oi.id, oi.order_id, oi.laundry_item_id, li.name, oi.quantity, oi.services, oi.item_total
			FROM order_items oi
			JOIN laundry_items li ON oi.laundry_item_id = li.id
			WHERE oi.order_id = ?
		`, order.ID)
		if err == nil {
			defer itemRows.Close()
			for itemRows.Next() {
				var item OrderItem
				if err := itemRows.Scan(&item.ID, &item.OrderID, &item.LaundryItemID, &item.ItemName, &item.Quantity, &item.Services, &item.ItemTotal); err == nil {
					order.Items = append(order.Items, item)
				}
			}
		}

		orders = append(orders, order)
	}

	respondJSON(w, http.StatusOK, orders)
}

// Admin: Get Statistics
func getAdminStats(w http.ResponseWriter, r *http.Request) {
	var stats struct {
		TotalOrders      int     `json:"total_orders"`
		PendingOrders    int     `json:"pending_orders"`
		ProcessingOrders int     `json:"processing_orders"`
		ReadyOrders      int     `json:"ready_orders"`
		DeliveredOrders  int     `json:"delivered_orders"`
		CancelledOrders  int     `json:"cancelled_orders"`
		TotalRevenue     float64 `json:"total_revenue"`
		TodayOrders      int     `json:"today_orders"`
		TotalCustomers   int     `json:"total_customers"`
	}

	// Total orders
	db.QueryRow("SELECT COUNT(*) FROM orders").Scan(&stats.TotalOrders)

	// Orders by status
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE status = 'pending'").Scan(&stats.PendingOrders)
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE status = 'processing'").Scan(&stats.ProcessingOrders)
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE status = 'ready'").Scan(&stats.ReadyOrders)
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE status = 'delivered'").Scan(&stats.DeliveredOrders)
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE status = 'cancelled'").Scan(&stats.CancelledOrders)

	// Total revenue
	db.QueryRow("SELECT COALESCE(SUM(total_amount), 0) FROM orders WHERE status = 'delivered'").Scan(&stats.TotalRevenue)

	// Today's orders
	db.QueryRow("SELECT COUNT(*) FROM orders WHERE DATE(created_at) = CURDATE()").Scan(&stats.TodayOrders)

	// Total customers
	db.QueryRow("SELECT COUNT(*) FROM users WHERE role = 'customer'").Scan(&stats.TotalCustomers)

	respondJSON(w, http.StatusOK, stats)
}

func createOrder(w http.ResponseWriter, r *http.Request) {
	userID, err := strconv.Atoi(r.Header.Get("X-User-ID"))
	if err != nil {
		respondError(w, http.StatusUnauthorized, "Invalid user")
		return
	}

	var req CreateOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "Invalid request body")
		return
	}

	// Start transaction
	tx, err := db.Begin()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}
	defer tx.Rollback()

	// Insert order
	result, err := tx.Exec(`
		INSERT INTO orders (user_id, status, total_amount, pickup_address, delivery_address, notes) 
		VALUES (?, 'pending', ?, ?, ?, ?)
	`, userID, req.TotalAmount, req.PickupAddress, req.DeliveryAddress, req.Notes)

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}

	lastID, err := result.LastInsertId()
	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to get order ID")
		return
	}
	orderID := int(lastID)

	// Insert order items
	for _, item := range req.Items {
		servicesJSON, _ := json.Marshal(item.Services)
		_, err = tx.Exec(`
			INSERT INTO order_items (order_id, laundry_item_id, quantity, services, item_total)
			VALUES (?, ?, ?, ?, ?)
		`, orderID, item.LaundryItemID, item.Quantity, string(servicesJSON), item.ItemTotal)

		if err != nil {
			respondError(w, http.StatusInternalServerError, "Failed to create order items")
			return
		}
	}

	// Commit transaction
	if err := tx.Commit(); err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to commit order")
		return
	}

	respondJSON(w, http.StatusCreated, map[string]interface{}{
		"id":      orderID,
		"message": "Order created successfully",
	})
}

// Helper functions
func getUserByID(id int) (*User, error) {
	var user User
	err := db.QueryRow(`
		SELECT id, email, full_name, COALESCE(phone, ''), COALESCE(address, ''), role, is_active, created_at 
		FROM users 
		WHERE id = ?
	`, id).Scan(&user.ID, &user.Email, &user.FullName, &user.Phone, &user.Address, &user.Role, &user.IsActive, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func generateToken(user *User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

func respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func respondError(w http.ResponseWriter, status int, message string) {
	respondJSON(w, status, map[string]string{"error": message})
}

func getEnv(key, defaultValue string) string {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}
	return value
}
