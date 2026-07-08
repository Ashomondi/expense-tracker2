package routes

import (
	"backend/handlers"
	"backend/middleware"
	"github.com/gin-gonic/gin"
)

func SetupRoutes(r *gin.Engine, authHandler *handlers.AuthHandler, jwtKey []byte) {
	// Expose files inside the uploads folder to the public web browser context
	r.Static("/uploads", "./uploads")

	// Public Authentication routes
	auth := r.Group("/api/auth")
	{
		auth.POST("/register", authHandler.Register)
		auth.POST("/login", authHandler.Login)
		auth.POST("/logout", authHandler.Logout)
	}

	// Protected Profile/Settings Management routes
	user := r.Group("/api/user")
	user.Use(middleware.JWTMiddleware(jwtKey))
	{
		user.GET("/profile", authHandler.GetProfile)
		user.PUT("/profile", authHandler.UpdateProfile)
		user.POST("/avatar", authHandler.UploadAvatar)
	}
}