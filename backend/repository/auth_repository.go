package repository

import (
	"expense-tracker/models"
	"database/sql"
)

type AuthRepository interface {
	CreateUser(user *models.User) error
	FindByEmail(email string) (*models.User, error)
}