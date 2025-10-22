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
	"github.com/golang-jwt/jwt/v5"
	_ "github.com/lib/pq"
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
	ID          int         `json:"id"`
	UserID      int         `json:"user_id"`
	Status      string      `json:"status"`
	TotalAmount float64     `json:"total_amount"`
	Notes       string      `json:"notes,omitempty"`
	CreatedAt   time.Time   `json:"created_at"`
	Items       []OrderItem `json:"items,omitempty"`
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
	jwt.RegisteredClaims
}

// Request/Response structs
type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	FullName string `json:"full_name"`
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
	TotalAmount float64              `json:"total_amount"`
	Notes       string               `json:"notes"`
	Items       []CreateOrderItemReq `json:"items"`
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
	dbPort := getEnv("DB_PORT", "5432")
	dbUser := getEnv("DB_USER", "postgres")
	dbPassword := getEnv("DB_PASSWORD", "postgres")
	dbName := getEnv("DB_NAME", "laundry")

	connStr := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable",
		dbHost, dbPort, dbUser, dbPassword, dbName)

	var err error
	db, err = sql.Open("postgres", connStr)
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

		// Add user ID to context
		r.Header.Set("X-User-ID", strconv.Itoa(claims.UserID))
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
	var userID int
	err = db.QueryRow(
		"INSERT INTO users (email, password_hash, full_name) VALUES ($1, $2, $3) RETURNING id",
		req.Email, string(hashedPassword), req.FullName,
	).Scan(&userID)

	if err != nil {
		if strings.Contains(err.Error(), "duplicate") {
			respondError(w, http.StatusConflict, "Email already exists")
		} else {
			respondError(w, http.StatusInternalServerError, "Failed to create user")
		}
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
	err := db.QueryRow("SELECT id, password_hash FROM users WHERE email = $1", req.Email).
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
		SELECT id, user_id, status, total_amount, COALESCE(notes, ''), created_at 
		FROM orders 
		WHERE user_id = $1 
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
		if err := rows.Scan(&order.ID, &order.UserID, &order.Status, &order.TotalAmount, &order.Notes, &order.CreatedAt); err != nil {
			continue
		}

		// Get order items
		itemRows, err := db.Query(`
			SELECT oi.id, oi.order_id, oi.laundry_item_id, li.name, oi.quantity, oi.services, oi.item_total
			FROM order_items oi
			JOIN laundry_items li ON oi.laundry_item_id = li.id
			WHERE oi.order_id = $1
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
	var orderID int
	err = tx.QueryRow(`
		INSERT INTO orders (user_id, status, total_amount, notes) 
		VALUES ($1, 'pending', $2, $3) 
		RETURNING id
	`, userID, req.TotalAmount, req.Notes).Scan(&orderID)

	if err != nil {
		respondError(w, http.StatusInternalServerError, "Failed to create order")
		return
	}

	// Insert order items
	for _, item := range req.Items {
		servicesJSON, _ := json.Marshal(item.Services)
		_, err = tx.Exec(`
			INSERT INTO order_items (order_id, laundry_item_id, quantity, services, item_total)
			VALUES ($1, $2, $3, $4, $5)
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
		SELECT id, email, full_name, COALESCE(phone, ''), COALESCE(address, ''), created_at 
		FROM users 
		WHERE id = $1
	`, id).Scan(&user.ID, &user.Email, &user.FullName, &user.Phone, &user.Address, &user.CreatedAt)

	if err != nil {
		return nil, err
	}

	return &user, nil
}

func generateToken(user *User) (string, error) {
	claims := Claims{
		UserID: user.ID,
		Email:  user.Email,
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
