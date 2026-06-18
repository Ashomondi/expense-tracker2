package models 

import "gorm.io/gorm"

type Expense struct {
	gorm.Model 
	UserID uint  `json:"user_id" gorm:"not null"`
	Title string `json:"title" gorm:"not null"`
	Amount float64 `json:"amount" gorm:"not null"`
	Category string `json:"category" gorm:"not null"`
}