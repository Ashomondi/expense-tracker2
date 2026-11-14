package models

import (
	"time"

	"gorm.io/gorm"
)

type Expense struct {
	ID        uint           `gorm:"primaryKey" json:"id"`
	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
	UserID    uint           `gorm:"not null;index" json:"user_id"`
	Title     string         `gorm:"not null" json:"title"`
	Amount    float64        `gorm:"not null" json:"amount"`
	Category  string         `gorm:"not null" json:"category"`
	Currency  string         `gorm:"default:KES" json:"currency"`
	Date      time.Time      `gorm:"not null" json:"date"`
}

type CreateExpenseInput struct {
	Title    string  `json:"title"`
	Amount   float64 `json:"amount"`
	Category string  `json:"category"`
	Currency string  `json:"currency"`
	Date     string  `json:"date"`
}

type MonthlySummaryResponse struct {
	TotalAmount          float64            `json:"total_amount"`
	AverageDailySpend    float64            `json:"average_daily_spend"`
	CategoryTotals       map[string]float64 `json:"category_totals"`
	PreviousMonthTotal   float64            `json:"previous_month_total"`
	ComparisonPct        float64            `json:"comparison_pct"`
	MonthOverMonthChange float64            `json:"month_over_month_change"`
	TransactionCount     int                `json:"transaction_count"`
	TotalCount           int64              `json:"total_count"`
	Month                int                `json:"month"`
	Year                 int                `json:"year"`
}
