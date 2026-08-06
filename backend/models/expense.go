package models

import (
	"time"
	"gorm.io/gorm"
)
type Expense struct {
	ID          uint           `gorm:"primaryKey" json:"id"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	DeletedAt   gorm.DeletedAt `gorm:"index" json:"-"`
	UserID      uint           `gorm:"not null;index" json:"user_id"`
	Title       string         `gorm:"not null" json:"title"`
	Amount      float64        `gorm:"not null" json:"amount"`
	Category    string         `gorm:"not null" json:"category"`
	Date        time.Time      `gorm:"not null" json:"date"`
}

type CreateExpenseInput struct {
	Title string `json:"title"`
	Amount float64 `json:"amount"`
	Category string `json:"category"`
	Date  string `json:"date"`
}