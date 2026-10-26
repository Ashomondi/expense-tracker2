package tests

import (
	"sync/atomic"
	"testing"

	"backend/models"

	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var userCounter atomic.Int64

func SetupTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open("file::memory:?cache=shared"), &gorm.Config{})
	if err != nil {
		t.Fatalf("Failed to open test database: %v", err)
	}

	if err := db.AutoMigrate(&models.User{}, &models.Expense{}, &models.Budget{}); err != nil {
		t.Fatalf("Failed to migrate test database: %v", err)
	}

	return db
}

func CreateTestUser(t *testing.T, db *gorm.DB) *models.User {
	user := &models.User{
		FullName: "Test User",
		Email:    "test@example.com",
		Password: "hashedpassword",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return user
}

func CreateUniqueTestUser(t *testing.T, db *gorm.DB) *models.User {
	counter := userCounter.Add(1)
	user := &models.User{
		FullName: "Test User",
		Email:    "test" + string(rune('a'+counter%26)) + string(rune('a'+(counter/26)%26)) + "@example.com",
		Password: "hashedpassword",
	}
	if err := db.Create(user).Error; err != nil {
		t.Fatalf("Failed to create test user: %v", err)
	}
	return user
}