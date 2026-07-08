package services

import (
	"backend/models"
	"backend/repository"
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

type AuthService interface {
	Register(input models.RegisterInput) error
	Login(input models.LoginInput) (*models.User, error)
	GenerateToken(userID uint) (string, error)
	GetProfile(userID uint) (*models.User, error)
	UpdateProfile(userID uint, input models.UpdateProfileInput) (*models.User, error)
	UpdateAvatar(userID uint, avatarPath string) (*models.User, error)
}

type authService struct {
	repo   repository.AuthRepository
	jwtKey []byte
}

func NewAuthService(repo repository.AuthRepository, jwtKey []byte) AuthService {
	return &authService{repo: repo, jwtKey: jwtKey}
}

func (s *authService) Register(input models.RegisterInput) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(input.Password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: string(hashedPassword),
	}
	return s.repo.CreateUser(&user)
}

func (s *authService) Login(input models.LoginInput) (*models.User, error) {
	user, err := s.repo.GetUserByEmail(input.Email)
	if err != nil {
		return nil, errors.New("invalid email or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(input.Password)); err != nil {
		return nil, errors.New("invalid email or password")
	}
	return user, nil
}

func (s *authService) GenerateToken(userID uint) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userId": userID,
		"exp":    time.Now().Add(time.Minute * 30).Unix(), // Auto-logout after 30 minutes of inactivity
	})
	return token.SignedString(s.jwtKey)
}

func (s *authService) GetProfile(userID uint) (*models.User, error) {
	return s.repo.GetUserByID(userID)
}

func (s *authService) UpdateProfile(userID uint, input models.UpdateProfileInput) (*models.User, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	if input.Name != "" { user.Name = input.Name }
	if input.Currency != "" { user.Currency = input.Currency }
	if input.MonthlyBudget >= 0 { user.MonthlyBudget = input.MonthlyBudget }

	return user, s.repo.UpdateUser(user)
}

func (s *authService) UpdateAvatar(userID uint, avatarPath string) (*models.User, error) {
	user, err := s.repo.GetUserByID(userID)
	if err != nil {
		return nil, err
	}
	user.AvatarURL = avatarPath
	return user, s.repo.UpdateUser(user)
}