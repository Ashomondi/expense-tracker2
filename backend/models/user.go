package models

import "time"

type User struct {
	ID            uint      `json:"id" gorm:"primaryKey"`
	Name          string    `json:"name" binding:"required"`
	Email         string    `json:"email" binding:"required,email" gorm:"unique"`
	Password      string    `json:"-"` // Cryptographic hash, hidden from JSON responses
	Currency      string    `json:"currency" gorm:"default:'USD'"`
	MonthlyBudget float64   `json:"monthly_budget" gorm:"default:0.0"`
	AvatarURL     string    `json:"avatar_url" gorm:"default:'/uploads/avatars/default-avatar.png'"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type RegisterInput struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=6"`
}

type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type UpdateProfileInput struct {
	Name          string  `json:"name"`
	Currency      string  `json:"currency"`
	MonthlyBudget float64 `json:"monthly_budget"`
}