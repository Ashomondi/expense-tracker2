package repository

import (
	"errors"

	"backend/models"

	"gorm.io/gorm"
)

var ErrBudgetNotFound = errors.New("budget not found")

type BudgetRepository interface {
	FindByID(id uint) (*models.Budget, error)
	FindByUserID(userID uint) ([]models.Budget, error)
	FindByUserIDAndCategory(userID uint, category string) (*models.Budget, error)
	Create(budget *models.Budget) error
	Update(budget *models.Budget) error
	Delete(id uint, userID uint) error
}

type budgetRepository struct {
	db *gorm.DB
}

func NewBudgetRepository(db *gorm.DB) BudgetRepository {
	return &budgetRepository{db: db}
}

func (r *budgetRepository) FindByID(id uint) (*models.Budget, error) {
	var budget models.Budget
	if err := r.db.Where("id = ?", id).First(&budget).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBudgetNotFound
		}
		return nil, err
	}
	return &budget, nil
}

func (r *budgetRepository) FindByUserID(userID uint) ([]models.Budget, error) {
	var budgets []models.Budget
	if err := r.db.Where("user_id = ?", userID).Find(&budgets).Error; err != nil {
		return nil, err
	}
	return budgets, nil
}

func (r *budgetRepository) FindByUserIDAndCategory(userID uint, category string) (*models.Budget, error) {
	var budget models.Budget
	if err := r.db.Where("user_id = ? AND category = ?", userID, category).First(&budget).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrBudgetNotFound
		}
		return nil, err
	}
	return &budget, nil
}

func (r *budgetRepository) Create(budget *models.Budget) error {
	return r.db.Create(budget).Error
}

func (r *budgetRepository) Update(budget *models.Budget) error {
	return r.db.Save(budget).Error
}

func (r *budgetRepository) Delete(id uint, userID uint) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Budget{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrBudgetNotFound
	}
	return nil
}