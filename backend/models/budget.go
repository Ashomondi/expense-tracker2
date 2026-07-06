package models

import "gorm.io/gorm"

type Budget struct {
	gorm.Model 
	UserID uint `json:"user_id" gorm:"not null"`
	Category string `json:"category" gorm:"not null"`
	Lmit float64 `json:"limit" gorm:"not null"`
}