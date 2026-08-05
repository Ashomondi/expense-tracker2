package main

import (
	"fmt"
	"log"
	"net/http"

	"backend/handlers"
	"backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func enableCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://localhost:5173")
		w.Header().Set("Access-Control-Allow-Credentials", "true")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

func main() {
	// Initialize SQLite Database
	db, err := gorm.Open(sqlite.Open("spendly.db"), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	// Auto Migrate User Model
	db.AutoMigrate(&models.User{})

	jwtKey := []byte("spendly_secret_jwt_key_2026")
	authHandler := handlers.NewAuthHandler(db, jwtKey)

	mux := http.NewServeMux()

	// Auth Routes
	mux.HandleFunc("/api/signup", authHandler.SignUp)
	mux.HandleFunc("/api/login", authHandler.Login)
	mux.HandleFunc("/api/logout", authHandler.Logout)
	mux.HandleFunc("/api/me", authHandler.GetMe)

	fmt.Println("🚀 Go Backend running at http://localhost:8080")
	if err := http.ListenAndServe(":8080", enableCORS(mux)); err != nil {
		log.Fatal(err)
	}
}