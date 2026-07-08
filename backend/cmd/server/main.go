package main

import (
	"log"
	"net/http"
	"os"

	"backend/config/database"
	"backend/handlers"
	"backend/repository"
	"backend/routes"
	"backend/services"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load Environment Variables from .env file
	if err := godotenv.Load(); err != nil {
		log.Println("Warning: No .env file found, falling back to system environment variables")
	}

	// 2. Fetch the Secret Key for JWT encryption
	jwtSecret := os.Getenv("JWT_SECRET")
	if jwtSecret == "" {
		log.Println("Warning: JWT_SECRET not set, using temporary fallback key")
		jwtSecret = "super_secret_fallback_key_123"
	}
	jwtKey := []byte(jwtSecret)

	// 3. Initialize Database Connection
	db := database.InitDB() 

	// 4. Instantiate Layers (Dependency Injection)
	authRepo := repository.NewAuthRepository(db)
	authService := services.NewAuthService(authRepo, jwtKey)
	authHandler := handlers.NewAuthHandler(authService)

	// 5. Initialize Gin Engine Router
	r := gin.Default()

	// 6. Global CORS Middleware (Configured explicitly for HttpOnly Cookies)
	r.Use(func(c *gin.Context) {
		// Replace with your exact frontend domain (e.g., "http://127.0.0.1:5500") 
		// Wildcard "*" cannot be used when transferring secure HttpOnly cookies.
		c.Writer.Header().Set("Access-Control-Allow-Origin", "http://127.0.0.1:5500") 
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true") // Crucial for cookie handling
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	// 7. Wire up routes from your routes assembly layer
	routes.SetupRoutes(r, authHandler, jwtKey)

	// 8. Ensure the static file uploads folder exists on startup for avatars
	if err := os.MkdirAll("./uploads/avatars", os.ModePerm); err != nil {
		log.Fatalf("Failed to create upload directories: %v", err)
	}

	// 9. Start the Go Web Server
	port := os.Getenv("PORT")
	if port == "" {
		port = "5000"
	}

	log.Printf("🚀 Expense Tracker Backend spinning up on port %s...", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}