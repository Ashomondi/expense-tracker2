package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"backend/handlers"
	"backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

// Simple CORS & Security Middleware
func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Adjust Origin URL in production
		frontendURL := os.Getenv("FRONTEND_URL")
		if frontendURL == "" {
			frontendURL = "http://localhost:5173"
		}
		w.Header().Set("Access-Control-Allow-Origin", frontendURL)
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// 1. Initialize JWT Secret Key
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		jwtSecret = "super-secret-spendly-key-change-in-production"
	}
	jwtKey := []byte(jwtSecret)

	// 2. Initialize Database (SQLite for development / change to Postgres for prod)
	var db *gorm.DB
	var err error
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		log.Println("Connecting to PostgreSQL database...")
		db, err = gorm.Open(postgres.Open(dbURL), &gorm.Config{})
	} else {
		log.Println("Connecting to SQLite database...")
		db, err = gorm.Open(sqlite.Open("spendly.db"), &gorm.Config{})
	}
	
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// 3. Auto-migrate DB Schema
	log.Println("Running database migrations...")
	if err := db.AutoMigrate(&models.User{}, &models.Expense{}); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// 4. Instantiate Handlers
	authHandler := handlers.NewAuthHandler(db, jwtKey)
	expenseHandler := handlers.NewExpenseHandler(db, jwtKey)

	// 5. Setup Router
	mux := http.NewServeMux()

	// Authentication Endpoints
	mux.HandleFunc("/api/signup", authHandler.SignUp)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/me", authHandler.GetMe)
	mux.HandleFunc("/api/logout", authHandler.Logout)

	// Expense Endpoints
	mux.HandleFunc("/api/expenses", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			expenseHandler.GetExpenses(w, r)
		case http.MethodPost:
			expenseHandler.CreateExpense(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// 6. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 Spendly server running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, enableCORS(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}