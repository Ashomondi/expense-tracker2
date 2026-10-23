package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"backend/handlers"
	"backend/models"
	"backend/repository"
	"backend/services"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
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
	if err := db.AutoMigrate(&models.User{}, &models.Expense{}, &models.Budget{}, &models.MpesaImport{}); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// 4. Instantiate Repositories
	expenseRepo := repository.NewExpenseRepository(db)
	mpesaRepo := repository.NewMpesaRepository(db)

	// 5. Instantiate Services
	expenseSvc := services.NewExpenseService(expenseRepo)
	mpesaSvc := services.NewMpesaService(mpesaRepo, expenseRepo)

	// 6. Instantiate Handlers
	authHandler := handlers.NewAuthHandler(db, jwtKey)
	expenseHandler := handlers.NewExpenseHandler(db, jwtKey)
	budgetHandler := handlers.NewBudgetHandler(db, jwtKey)
	mpesaHandler := handlers.NewMpesaHandler(db, jwtKey, mpesaSvc, expenseSvc)

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
		case http.MethodDelete:
			expenseHandler.DeleteExpense(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// Budget Endpoints
	mux.HandleFunc("/api/budgets", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			budgetHandler.GetBudgets(w, r)
		case http.MethodPost, http.MethodPut:
			budgetHandler.SetBudget(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// M-Pesa Integration Endpoints
	mux.HandleFunc("/api/integrations/mpesa/import", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			mpesaHandler.ImportTransactions(w, r)
		case http.MethodDelete:
			mpesaHandler.DeleteImport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/integrations/mpesa/preview", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			mpesaHandler.PreviewTransaction(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/integrations/mpesa/imports", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			mpesaHandler.GetImportHistory(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/integrations/mpesa/status", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodGet:
			mpesaHandler.GetImportStatus(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	mux.HandleFunc("/api/integrations/mpesa/expense", func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost:
			mpesaHandler.CreateExpenseFromImport(w, r)
		default:
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		}
	})

	// 7. Start Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Printf("🚀 Spendly server running on http://localhost:%s\n", port)
	if err := http.ListenAndServe(":"+port, enableCORS(mux)); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
