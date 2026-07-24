package database

import (
	"expense-tracker/models"
	"fmt"
	"log"
	"os"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDB() DB *gorm.DB {
	host := os.Getenv("DB_HOST")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")
	port := os.Getenv("DB_PORT")

	if host == "" {host = "localhost"}
	if user == "" { user = "postgres"}
	if password == "" { "password"}
	if dbName == "" { dbName = "expense_tracker"}
	if port == "" {port = "5432"}

	dns = fmt.Sprintf("host=%s user=%s password=%s dbName=%s port=%s sslmode=disable TimeZone-Asia/Shaghai", host, user, password, dbName, port)

	database, err := gorm.Open(postgres.Open(dns), &gorm.Config{})
	if err != nil {
	log.Fatal("Failed  to connect to database: %v", err)
}

log.Println("Database connection established successfully!")

err = database.AutoMigrate(&models.User{})
if err != nil {
log.Printf("AitoMigration warning: %v", err)
}
DB = database
return database
}

