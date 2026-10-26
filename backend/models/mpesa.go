package models

import (
	"time"

	"gorm.io/gorm"
)

type MpesaTransactionType string

const (
	MpesaTypeReceived          MpesaTransactionType = "received"
	MpesaTypeSent              MpesaTransactionType = "sent"
	MpesaTypePayBill           MpesaTransactionType = "paybill"
	MpesaTypeBuyGoods          MpesaTransactionType = "buy_goods"
	MpesaTypeWithdrawal        MpesaTransactionType = "withdrawal"
	MpesaTypeDeposit           MpesaTransactionType = "deposit"
	MpesaTypeAirtime           MpesaTransactionType = "airtime"
	MpesaTypeReversal          MpesaTransactionType = "reversal"
	MpesaTypeUnknown           MpesaTransactionType = "unknown"
)

type MpesaImportStatus string

const (
	MpesaImportStatusImported  MpesaImportStatus = "imported"
	MpesaImportStatusSkipped   MpesaImportStatus = "skipped"
	MpesaImportStatusDuplicate MpesaImportStatus = "duplicate"
	MpesaImportStatusFailed    MpesaImportStatus = "failed"
	MpesaImportStatusPending   MpesaImportStatus = "pending"
)

type MpesaImport struct {
	ID              uint           `gorm:"primaryKey" json:"id"`
	CreatedAt       time.Time      `json:"created_at"`
	UpdatedAt       time.Time      `json:"updated_at"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
	UserID          uint           `gorm:"not null;index" json:"user_id"`
	TransactionRef  string         `gorm:"size:50;index" json:"transaction_ref"`
	Fingerprint     string         `gorm:"size:64;uniqueIndex:idx_user_fingerprint" json:"fingerprint"`
	TransactionType MpesaTransactionType `gorm:"size:20;not null" json:"transaction_type"`
	Amount          float64        `gorm:"not null" json:"amount"`
	Fee             float64        `json:"fee"`
	Balance         float64        `json:"balance"`
	Sender          string         `gorm:"size:100" json:"sender"`
	Recipient       string         `gorm:"size:100" json:"recipient"`
	PhoneNumber     string         `gorm:"size:20" json:"phone_number"`
	TransactionDate time.Time      `gorm:"not null;index" json:"transaction_date"`
	RawMessage      string         `gorm:"type:text" json:"-"`
	Status          MpesaImportStatus `gorm:"size:20;not null;default:'pending'" json:"status"`
	ErrorMessage    string         `gorm:"type:text" json:"error_message,omitempty"`
	ExpenseID       *uint          `json:"expense_id,omitempty"`
	Currency        string         `gorm:"default:KES" json:"currency"`
}

type MpesaImportInput struct {
	TransactionRef  string              `json:"transaction_ref"`
	TransactionType MpesaTransactionType `json:"transaction_type"`
	Amount          float64             `json:"amount"`
	Fee             float64             `json:"fee"`
	Balance         float64             `json:"balance"`
	Sender          string              `json:"sender"`
	Recipient       string              `json:"recipient"`
	PhoneNumber     string              `json:"phone_number"`
	TransactionDate string              `json:"transaction_date"`
	RawMessage      string              `json:"raw_message"`
	Currency        string              `json:"currency"`
}

type MpesaImportResult struct {
	Imported  int `json:"imported"`
	Skipped   int `json:"skipped"`
	Duplicates int `json:"duplicates"`
	Failed    int `json:"failed"`
	Details   []MpesaImportDetail `json:"details"`
}

type MpesaImportDetail struct {
	TransactionRef  string             `json:"transaction_ref"`
	Status          MpesaImportStatus  `json:"status"`
	ErrorMessage    string             `json:"error_message,omitempty"`
	ExpenseID       *uint              `json:"expense_id,omitempty"`
	Amount          float64            `json:"amount"`
	TransactionType MpesaTransactionType `json:"transaction_type"`
}

type MpesaParserResult struct {
	TransactionRef  string
	TransactionType MpesaTransactionType
	Amount          float64
	Fee             float64
	Balance         float64
	Sender          string
	Recipient       string
	PhoneNumber     string
	TransactionDate time.Time
	Confidence      float64
	RawMessage      string
	Errors          []string
}

func (m *MpesaImport) ToExpenseInput(category string) CreateExpenseInput {
	currency := m.Currency
	if currency == "" {
		currency = "KES"
	}
	return CreateExpenseInput{
		Title:    m.getDefaultTitle(),
		Amount:   m.Amount,
		Category: category,
		Currency: currency,
		Date:     m.TransactionDate.Format("2006-01-02"),
	}
}

func (m *MpesaImport) getDefaultTitle() string {
	switch m.TransactionType {
	case MpesaTypeSent:
		if m.Recipient != "" {
			return "M-Pesa Send to " + m.Recipient
		}
		return "M-Pesa Send"
	case MpesaTypePayBill:
		if m.Recipient != "" {
			return "M-Pesa PayBill: " + m.Recipient
		}
		return "M-Pesa PayBill"
	case MpesaTypeBuyGoods:
		if m.Recipient != "" {
			return "M-Pesa Till: " + m.Recipient
		}
		return "M-Pesa Till Payment"
	case MpesaTypeWithdrawal:
		return "M-Pesa Withdrawal"
	case MpesaTypeAirtime:
		return "M-Pesa Airtime Purchase"
	case MpesaTypeReversal:
		return "M-Pesa Reversal"
	default:
		return "M-Pesa Transaction"
	}
}

func (m *MpesaImport) MapToCategory() string {
	switch m.TransactionType {
	case MpesaTypeSent:
		return "Transport"
	case MpesaTypePayBill:
		return "Utilities"
	case MpesaTypeBuyGoods:
		return "Shopping"
	case MpesaTypeWithdrawal:
		return "Transport"
	case MpesaTypeAirtime:
		return "Utilities"
	case MpesaTypeReversal:
		return "Food & Drink"
	default:
		return "Food & Drink"
	}
}