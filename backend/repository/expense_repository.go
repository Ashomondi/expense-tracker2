package repository

import (
	"errors"

	"backend/models"

	"gorm.io/gorm"
)

var ErrExpenseNotFound = errors.New("expense not found")

type ExpenseRepository interface {
	FindByID(id uint) (*models.Expense, error)
	FindByUserID(userID uint) ([]models.Expense, error)
	Create(expense *models.Expense) error
	Update(expense *models.Expense) error
	Delete(id uint, userID uint) error
	FindByUserIDAndCategory(userID uint, category string) ([]models.Expense, error)
	FindByUserIDAndDateRange(userID uint, startDate, endDate string) ([]models.Expense, error)
}

type expenseRepository struct {
	db *gorm.DB
}

func NewExpenseRepository(db *gorm.DB) ExpenseRepository {
	return &expenseRepository{db: db}
}

func (r *expenseRepository) FindByID(id uint) (*models.Expense, error) {
	var expense models.Expense
	if err := r.db.Where("id = ?", id).First(&expense).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrExpenseNotFound
		}
		return nil, err
	}
	return &expense, nil
}

func (r *expenseRepository) FindByUserID(userID uint) ([]models.Expense, error) {
	var expenses []models.Expense
	if err := r.db.Where("user_id = ?", userID).Order("date desc").Find(&expenses).Error; err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *expenseRepository) Create(expense *models.Expense) error {
	return r.db.Create(expense).Error
}

func (r *expenseRepository) Update(expense *models.Expense) error {
	return r.db.Save(expense).Error
}

func (r *expenseRepository) Delete(id uint, userID uint) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.Expense{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrExpenseNotFound
	}
	return nil
}

func (r *expenseRepository) FindByUserIDAndCategory(userID uint, category string) ([]models.Expense, error) {
	var expenses []models.Expense
	if err := r.db.Where("user_id = ? AND category = ?", userID, category).Order("date desc").Find(&expenses).Error; err != nil {
		return nil, err
	}
	return expenses, nil
}

func (r *expenseRepository) FindByUserIDAndDateRange(userID uint, startDate, endDate string) ([]models.Expense, error) {
	var expenses []models.Expense
	if err := r.db.Where("user_id = ? AND date BETWEEN ? AND ?", userID, startDate, endDate).Order("date desc").Find(&expenses).Error; err != nil {
		return nil, err
	}
	return expenses, nil
}