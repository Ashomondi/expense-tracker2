package routes

import (
	"net/http"

	"expense-tracker2/backend/handlers"
	"expense-tracker2/backend/middleware"

	"github.com/gin-gonic/gin"
)

// Dependencies bundles everything routes.Setup needs to wire handlers.
// As expenses/budgets/dashboard handlers are implemented, add their
// constructed instances here rather than reaching into globals.
type Dependencies struct {
	AuthHandler *handlers.AuthHandler
	JWTSecret   string
}

func Setup(router *gin.Engine, deps Dependencies) {
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "ok"})
	})

	// Public auth routes
	router.POST("/signup", deps.AuthHandler.Signup)
	router.POST("/login", deps.AuthHandler.Login)

	
}