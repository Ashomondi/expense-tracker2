package main

import (
	"log"

	"expense-tracker2/backend/config"
	"expense-tracker2/backend/database"
	"expense-tracker2/backend/handlers"
	"expense-tracker2/backend/repository"
	"expense-tracker2/backend/routes"
	"expense-tracker2/backend/services"

	"github.com/gin-gonic/gin"
)

func main() {
	cfg := config.Load()

	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("database initialization failed: %v", err)
	}

	// Wire the auth vertical: repository -> service -> handler.
	authRepo := repository.NewAuthRepository(db)
	authService := services.NewAuthService(authRepo, cfg.JWTSecret, cfg.JWTExpiration)
	authHandler := handlers.NewAuthHandler(authService)

	router := gin.New()
	router.Use(gin.Recovery())

	routes.Setup(router, routes.Dependencies{
		AuthHandler: authHandler,
		JWTSecret:   cfg.JWTSecret,
	})

	log.Printf("server starting on :%s", cfg.Port)
	if err := router.Run(":" + cfg.Port); err != nil {
		log.Fatalf("server failed to start: %v", err)
	}
}