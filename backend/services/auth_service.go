package services

import (
	"errors"
	"strings"
	"time"

	"expense-tracker2/backend/models"
	"expense-tracker2/backend/repository"
	"expense-tracker2/backend/utils"
)

// ErrEmailTaken is returned when signing up with an email already in use.
var ErrEmailTaken = errors.New("an account with this email already exists")

// ErrInvalidCredentials is returned for both "no such user" and "wrong
// password" cases on login, so callers never leak which emails exist.
var ErrInvalidCredentials = errors.New("invalid email or password")

// SignupInput is the data required to create a new account.
type SignupInput struct {
	Name     string
	Email    string
	Password string
}

// LoginInput is the data required to authenticate.
type LoginInput struct {
	Email    string
	Password string
}

// AuthResult is returned on successful signup/login.
type AuthResult struct {
	User  *models.User
	Token string
}

// AuthService defines the auth business logic exposed to handlers.
type AuthService interface {
	Signup(input SignupInput) (*AuthResult, error)
	Login(input LoginInput) (*AuthResult, error)
}

type authService struct {
	repo          repository.AuthRepository
	jwtSecret     string
	jwtExpiration time.Duration
}

// NewAuthService constructs an AuthService. jwtSecret/jwtExpiration come
// from config, injected at startup rather than read from env here, so the
// service stays easy to unit test.
func NewAuthService(repo repository.AuthRepository, jwtSecret string, jwtExpiration time.Duration) AuthService {
	return &authService{
		repo:          repo,
		jwtSecret:     jwtSecret,
		jwtExpiration: jwtExpiration,
	}
}

func (s *authService) Signup(input SignupInput) (*AuthResult, error) {
	email := normalizeEmail(input.Email)

	if !utils.IsValidEmail(email) {
		return nil, errors.New("invalid email address")
	}
	if !utils.IsStrongPassword(input.Password) {
		return nil, errors.New("password must be at least 8 characters and include a letter and a number")
	}

	exists, err := s.repo.ExistsByEmail(email)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, ErrEmailTaken
	}

	hashed, err := utils.HashPassword(input.Password)
	if err != nil {
		return nil, err
	}

	user := &models.User{
		Name:     strings.TrimSpace(input.Name),
		Email:    email,
		Password: hashed,
	}

	if err := s.repo.Create(user); err != nil {
		return nil, err
	}

	token, err := utils.GenerateJWT(user.ID, s.jwtSecret, s.jwtExpiration)
	if err != nil {
		return nil, err
	}

	return &AuthResult{User: user, Token: token}, nil
}

func (s *authService) Login(input LoginInput) (*AuthResult, error) {
	email := normalizeEmail(input.Email)

	user, err := s.repo.FindByEmail(email)
	if err != nil {
		if errors.Is(err, repository.ErrUserNotFound) {
			return nil, ErrInvalidCredentials
		}
		return nil, err
	}

	if !utils.CheckPasswordHash(input.Password, user.Password) {
		return nil, ErrInvalidCredentials
	}

	token, err := utils.GenerateJWT(user.ID, s.jwtSecret, s.jwtExpiration)
	if err != nil {
		return nil, err
	}

	return &AuthResult{User: user, Token: token}, nil
}

func normalizeEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}