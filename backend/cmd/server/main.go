package main 

import (
	"expense-tracker/database"
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main () {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, defaulting to system enviroment variables")
	}
	database.ConnectDatabase()
	r:= gin.Default()
	r.GET("/ping", func(c *gin.Context) {
		c.JSON((200, gin.H{"message": "pong"}))
	})
	port := os.Getenv("PORT")
	if port == "" {
	port = 80808
	}
	r.Run(":" + port)
}

