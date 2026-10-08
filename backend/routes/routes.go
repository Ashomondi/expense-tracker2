package main

import (
	"net/http"

	"backend/handlers"
	"backend/middleware"

	"gorm.io/gorm"
)

// RegisterRoutes sets up all API endpoints and applies global middleware
func RegisterRoutes(db *gorm.DB, jwtKey []byte) http.Handler {
	mux := http.NewServeMux()

	// Instantiate Handlers
	authHandler := handlers.NewAuthHandler(db, jwtKey)
	expenseHandler := handlers.NewExpenseHandler(db, jwtKey)
	budgetHandler := handlers.NewBudgetHandler(db, jwtKey)

	// Health Check Endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status":"ok","app":"Spendly API"}`))
	})

	// Auth Endpoints
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

	// Return standard mux wrapped with CORS middleware
	return middleware.EnableCORS(mux)
}
