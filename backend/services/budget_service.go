package services

import (
	"errors"

	"backend/models"
	"gorm.io/gorm"
)

type BudgetService struct {
	DB *gorm.DB
}

func NewBudgetService(db *gorm.DB) *BudgetService {
	return &BudgetService{DB: db}
}

// GetUserBudgets retrieves all budgets created by a specific user
func (s *BudgetService) GetUserBudgets(userID uint) ([]models.Budget, error) {
	var budgets []models.Budget
	result := s.DB.Where("user_id = ?", userID).Find(&budgets)
	if result.Error != nil {
		return nil, result.Error
	}
	return budgets, nil
}

// UpsertBudget creates a new budget entry or updates the limit if it already exists
func (s *BudgetService) UpsertBudget(userID uint, category string, amount float64) (*models.Budget, error) {
	if category == "" {
		return nil, errors.New("category cannot be empty")
	}
	if amount <= 0 {
		return nil, errors.New("budget amount must be greater than zero")
	}

	var budget models.Budget
	result := s.DB.Where("user_id = ? AND category = ?", userID, category).First(&budget)

	if result.Error != nil {
		// Entry does not exist, create a new record
		budget = models.Budget{
			UserID:   userID,
			Category: category,
			Amount:   amount,
		}
		if err := s.DB.Create(&budget).Error; err != nil {
			return nil, err
		}
	} else {
		// Entry exists, update the budget amount
		budget.Amount = amount
		if err := s.DB.Save(&budget).Error; err != nil {
			return nil, err
		}
	}

	return &budget, nil
}