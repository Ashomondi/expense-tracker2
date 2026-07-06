package storage 

import (
	"expense-tracker/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func ConnectDatabase () {
	dsn := os.Getenv("DB_URL")
	if dsn == "" {
		log.Fatal("DB_URL enviroment variable is not set")
	}
	database, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if er != nil {
		panic("Failed to connect to database")
	}
	err = database.AutoMIgrate(&models.User{}, &models.Expense{}, &models.Budget{})
	if err != nil {
		log.Fatal("Database Migration Failed:", err)
	}
	fmt.Println("Database connection successfully established and migrated")
	db = database
}