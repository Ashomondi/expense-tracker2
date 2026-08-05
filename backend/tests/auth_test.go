package tests

import (
	"testing"
	"time"

	"expense-tracker2/backend/models"
	"expense-tracker2/backend/repository"
	"expense-tracker2/backend/services"
	"expense-tracker2/backend/utils"

	"github.com/google/uuid"
)

// mockAuthRepository is an in-memory stand-in for repository.AuthRepository,
// so the service layer can be tested without a real database.
type mockAuthRepository struct {
	usersByEmail map[string]*models.User
}

func newMockAuthRepository() *mockAuthRepository {
	return &mockAuthRepository{usersByEmail: make(map[string]*models.User)}
}

func (m *mockAuthRepository) FindByEmail(email string) (*models.User, error) {
	if u, ok := m.usersByEmail[email]; ok {
		return u, nil
	}
	return nil, repository.ErrUserNotFound
}

func (m *mockAuthRepository) FindByID(id uuid.UUID) (*models.User, error) {
	for _, u := range m.usersByEmail {
		if u.ID == id {
			return u, nil
		}
	}
	return nil, repository.ErrUserNotFound
}

func (m *mockAuthRepository) Create(user *models.User) error {
	if user.ID == uuid.Nil {
		user.ID = uuid.New()
	}
	m.usersByEmail[user.Email] = user
	return nil
}

func (m *mockAuthRepository) ExistsByEmail(email string) (bool, error) {
	_, ok := m.usersByEmail[email]
	return ok, nil
}

func newTestAuthService() (services.AuthService, *mockAuthRepository) {
	repo := newMockAuthRepository()
	svc := services.NewAuthService(repo, "test-secret", time.Hour)
	return svc, repo
}

func TestSignup_Success(t *testing.T) {
	svc, _ := newTestAuthService()

	result, err := svc.Signup(services.SignupInput{
		Name:     "Ashley",
		Email:    "Ashley@Example.com",
		Password: "password123",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if result.Token == "" {
		t.Fatal("expected a non-empty token")
	}
	if result.User.Email != "ashley@example.com" {
		t.Fatalf("expected email to be normalized to lowercase, got %s", result.User.Email)
	}
	if result.User.Password == "password123" {
		t.Fatal("password should be hashed, not stored in plaintext")
	}
}

func TestSignup_DuplicateEmail(t *testing.T) {
	svc, _ := newTestAuthService()

	input := services.SignupInput{Name: "Ashley", Email: "ashley@example.com", Password: "password123"}
	if _, err := svc.Signup(input); err != nil {
		t.Fatalf("first signup should succeed, got %v", err)
	}

	_, err := svc.Signup(input)
	if err != services.ErrEmailTaken {
		t.Fatalf("expected ErrEmailTaken, got %v", err)
	}
}

func TestSignup_WeakPassword(t *testing.T) {
	svc, _ := newTestAuthService()

	_, err := svc.Signup(services.SignupInput{
		Name:     "Ashley",
		Email:    "ashley@example.com",
		Password: "short",
	})
	if err == nil {
		t.Fatal("expected an error for a weak password")
	}
}

func TestLogin_Success(t *testing.T) {
	svc, _ := newTestAuthService()

	_, err := svc.Signup(services.SignupInput{Name: "Ashley", Email: "ashley@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("setup signup failed: %v", err)
	}

	result, err := svc.Login(services.LoginInput{Email: "ashley@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("expected login to succeed, got %v", err)
	}
	if result.Token == "" {
		t.Fatal("expected a non-empty token")
	}

	claims, err := utils.ParseJWT(result.Token, "test-secret")
	if err != nil {
		t.Fatalf("expected token to parse successfully, got %v", err)
	}
	if claims.UserID != result.User.ID {
		t.Fatal("token user ID should match the logged-in user")
	}
}

func TestLogin_WrongPassword(t *testing.T) {
	svc, _ := newTestAuthService()

	_, err := svc.Signup(services.SignupInput{Name: "Ashley", Email: "ashley@example.com", Password: "password123"})
	if err != nil {
		t.Fatalf("setup signup failed: %v", err)
	}

	_, err = svc.Login(services.LoginInput{Email: "ashley@example.com", Password: "wrongpassword"})
	if err != services.ErrInvalidCredentials {
		t.Fatalf("expected ErrInvalidCredentials, got %v", err)
	}
}

func TestLogin_UnknownEmail(t *testing.T) {
	svc, _ := newTestAuthService()

	_, err := svc.Login(services.LoginInput{Email: "nobody@example.com", Password: "password123"})
	if err != services.ErrInvalidCredentials {
		t.Fatalf("expected ErrInvalidCredentials for unknown email, got %v", err)
	}
}