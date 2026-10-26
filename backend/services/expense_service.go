package services

import (
	"errors"
	"time"

	"backend/models"
	"backend/repository"
)

var (
	ErrExpenseNotFound = errors.New("expense not found")
	ErrInvalidExpense  = errors.New("invalid expense data")
)

type ExpenseService interface {
	GetUserExpenses(userID uint) ([]models.Expense, error)
	GetExpenseByID(userID uint, expenseID uint) (*models.Expense, error)
	CreateExpense(userID uint, input models.CreateExpenseInput) (*models.Expense, error)
	UpdateExpense(userID uint, expenseID uint, input models.CreateExpenseInput) (*models.Expense, error)
	DeleteExpense(userID uint, expenseID uint) error
	GetExpensesByCategory(userID uint, category string) ([]models.Expense, error)
	GetExpensesByDateRange(userID uint, startDate, endDate string) ([]models.Expense, error)
	GetMonthlySummary(userID uint, year int, month int) (map[string]interface{}, error)
	GetCategoryBreakdown(userID uint) (map[string]float64, error)
}

type expenseService struct {
	expenseRepo repository.ExpenseRepository
}

func NewExpenseService(expenseRepo repository.ExpenseRepository) ExpenseService {
	return &expenseService{expenseRepo: expenseRepo}
}

func (s *expenseService) GetUserExpenses(userID uint) ([]models.Expense, error) {
	return s.expenseRepo.FindByUserID(userID)
}

func (s *expenseService) GetExpenseByID(userID uint, expenseID uint) (*models.Expense, error) {
	expense, err := s.expenseRepo.FindByID(expenseID)
	if err != nil {
		if errors.Is(err, repository.ErrExpenseNotFound) {
			return nil, ErrExpenseNotFound
		}
		return nil, err
	}
	if expense.UserID != userID {
		return nil, ErrExpenseNotFound
	}
	return expense, nil
}

func (s *expenseService) CreateExpense(userID uint, input models.CreateExpenseInput) (*models.Expense, error) {
	if input.Title == "" {
		return nil, ErrInvalidExpense
	}
	if input.Amount <= 0 {
		return nil, ErrInvalidExpense
	}
	if input.Category == "" {
		return nil, ErrInvalidExpense
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		parsedDate = time.Now()
	}

	currency := input.Currency
	if currency == "" {
		currency = "KES"
	}

	expense := &models.Expense{
		UserID:   userID,
		Title:    input.Title,
		Amount:   input.Amount,
		Category: input.Category,
		Currency: currency,
		Date:     parsedDate,
	}

	if err := s.expenseRepo.Create(expense); err != nil {
		return nil, err
	}
	return expense, nil
}

func (s *expenseService) UpdateExpense(userID uint, expenseID uint, input models.CreateExpenseInput) (*models.Expense, error) {
	expense, err := s.expenseRepo.FindByID(expenseID)
	if err != nil {
		return nil, err
	}
	if expense.UserID != userID {
		return nil, ErrExpenseNotFound
	}

	if input.Title == "" {
		return nil, ErrInvalidExpense
	}
	if input.Amount <= 0 {
		return nil, ErrInvalidExpense
	}
	if input.Category == "" {
		return nil, ErrInvalidExpense
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		parsedDate = time.Now()
	}

	currency := input.Currency
	if currency == "" {
		currency = "KES"
	}

	expense.Title = input.Title
	expense.Amount = input.Amount
	expense.Category = input.Category
	expense.Currency = currency
	expense.Date = parsedDate

	if err := s.expenseRepo.Update(expense); err != nil {
		return nil, err
	}
	return expense, nil
}

func (s *expenseService) DeleteExpense(userID uint, expenseID uint) error {
	return s.expenseRepo.Delete(expenseID, userID)
}

func (s *expenseService) GetExpensesByCategory(userID uint, category string) ([]models.Expense, error) {
	return s.expenseRepo.FindByUserIDAndCategory(userID, category)
}

func (s *expenseService) GetExpensesByDateRange(userID uint, startDate, endDate string) ([]models.Expense, error) {
	return s.expenseRepo.FindByUserIDAndDateRange(userID, startDate, endDate)
}

func (s *expenseService) GetMonthlySummary(userID uint, year int, month int) (map[string]interface{}, error) {
	startDate := time.Date(year, time.Month(month), 1, 0, 0, 0, 0, time.UTC)
	endDate := startDate.AddDate(0, 1, 0).Add(-time.Second)

	expenses, err := s.expenseRepo.FindByUserIDAndDateRange(userID, startDate.Format("2006-01-02"), endDate.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}

	var total float64
	categoryTotals := make(map[string]float64)
	for _, exp := range expenses {
		total += exp.Amount
		categoryTotals[exp.Category] += exp.Amount
	}

	return map[string]interface{}{
		"total":            total,
		"category_totals":  categoryTotals,
		"transaction_count": len(expenses),
		"month":            month,
		"year":             year,
	}, nil
}

func (s *expenseService) GetCategoryBreakdown(userID uint) (map[string]float64, error) {
	expenses, err := s.expenseRepo.FindByUserID(userID)
	if err != nil {
		return nil, err
	}

	breakdown := make(map[string]float64)
	for _, exp := range expenses {
		breakdown[exp.Category] += exp.Amount
	}
	return breakdown, nil
}