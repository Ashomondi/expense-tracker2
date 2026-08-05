package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Expense represents a single expense entry belonging to a user.
type Expense struct {
	ID        uuid.UUID `gorm:"type:uuid;primaryKey" json:"id"`
	UserID    uuid.UUID `gorm:"type:uuid;index;not null" json:"user_id"`
	Title     string    `gorm:"not null" json:"title"`
	Amount    float64   `gorm:"not null" json:"amount"`
	Category  string    `gorm:"index;not null" json:"category"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func (e *Expense) BeforeCreate(tx *gorm.DB) (err error) {
	if e.ID == uuid.Nil {
		e.ID = uuid.New()
	}
	return
}