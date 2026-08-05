package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Budget represents a monthly spending limit for a category, per user.
type Budget struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null" json:"user_id"`
	Category  string    `gorm:"index;not null" json:"category"`
	Limit     float64   `gorm:"column:monthly_limit;not null" json:"limit"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (b *Budget) BeforeCreate(tx *gorm.DB) (err error) {
	if b.ID == uuid.Nil {
		b.ID = uuid.New()
	}
	return
}

func (Budget) TableName() string {
	return "budgets"
}