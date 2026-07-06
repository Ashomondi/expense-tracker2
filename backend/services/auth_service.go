package service 

import (
	"expense-tracker/models"
    "expense-tracker/repository"
    "golang.org/x/crypto/bcrypt"
)

type AuthService struct {
	Repo repository.AuthRepository
}

func (s *AuthService) Register(input models.RegisterInput) error{
	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(input.Password), 10)
	user := &models.User{Name: input.Name, Email: input.Email, Password: string(hashedpassword)}
	return s.Repo.CreateUser(user)
}
