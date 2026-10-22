package tests

import (
	"testing"
	"time"

	"backend/models"
	"backend/repository"
	"backend/services"
	"backend/utils"

	"github.com/google/uuid"
)

func TestAuthService_Signup(t *testing.T) {
	db := SetupTestDB(t)
	authRepo := repository.NewAuthRepository(db)
	authService := services.NewAuthService(authRepo, "test-secret", 24*time.Hour)

	t.Run("successful signup", func(t *testing.T) {
		input := services.SignupInput{
			Name:     "Test User",
			Email:    "test@example.com",
			Password: "Password123!",
		}

		result, err := authService.Signup(input)
		if err != nil {
			t.Fatalf("Signup failed: %v", err)
		}

		if result.User == nil {
			t.Fatal("User should not be nil")
		}
		if result.User.Email != "test@example.com" {
			t.Errorf("Expected email test@example.com, got %s", result.User.Email)
		}
		if result.User.FullName != "Test User" {
			t.Errorf("Expected name Test User, got %s", result.User.FullName)
		}
		if result.Token == "" {
			t.Fatal("Token should not be empty")
		}
		if result.User.Password == "Password123!" {
			t.Fatal("Password should be hashed")
		}
	})

	t.Run("duplicate email fails", func(t *testing.T) {
		input := services.SignupInput{
			Name:     "Another User",
			Email:    "test@example.com",
			Password: "Password123!",
		}

		_, err := authService.Signup(input)
		if err == nil {
			t.Fatal("Expected error for duplicate email")
		}
		if err != services.ErrEmailTaken {
			t.Errorf("Expected ErrEmailTaken, got %v", err)
		}
	})

	t.Run("weak password fails", func(t *testing.T) {
		input := services.SignupInput{
			Name:     "Weak Password User",
			Email:    "weak@example.com",
			Password: "123",
		}

		_, err := authService.Signup(input)
		if err == nil {
			t.Fatal("Expected error for weak password")
		}
	})

	t.Run("invalid email fails", func(t *testing.T) {
		input := services.SignupInput{
			Name:     "Invalid Email User",
			Email:    "not-an-email",
			Password: "Password123!",
		}

		_, err := authService.Signup(input)
		if err == nil {
			t.Fatal("Expected error for invalid email")
		}
	})
}

func TestAuthService_Login(t *testing.T) {
	db := SetupTestDB(t)
	authRepo := repository.NewAuthRepository(db)
	authService := services.NewAuthService(authRepo, "test-secret", 24*time.Hour)

	t.Run("successful login", func(t *testing.T) {
		_, err := authService.Signup(services.SignupInput{
			Name:     "Login User",
			Email:    "login@example.com",
			Password: "Password123!",
		})
		if err != nil {
			t.Fatalf("Signup failed: %v", err)
		}

		result, err := authService.Login(services.LoginInput{
			Email:    "login@example.com",
			Password: "Password123!",
		})
		if err != nil {
			t.Fatalf("Login failed: %v", err)
		}

		if result.User == nil {
			t.Fatal("User should not be nil")
		}
		if result.Token == "" {
			t.Fatal("Token should not be empty")
		}
	})

	t.Run("wrong password fails", func(t *testing.T) {
		_, err := authService.Login(services.LoginInput{
			Email:    "login@example.com",
			Password: "WrongPassword123!",
		})
		if err == nil {
			t.Fatal("Expected error for wrong password")
		}
		if err != services.ErrInvalidCredentials {
			t.Errorf("Expected ErrInvalidCredentials, got %v", err)
		}
	})

	t.Run("non-existent user fails", func(t *testing.T) {
		_, err := authService.Login(services.LoginInput{
			Email:    "nonexistent@example.com",
			Password: "Password123!",
		})
		if err == nil {
			t.Fatal("Expected error for non-existent user")
		}
		if err != services.ErrInvalidCredentials {
			t.Errorf("Expected ErrInvalidCredentials, got %v", err)
		}
	})
}

func TestAuthRepository(t *testing.T) {
	db := SetupTestDB(t)
	repo := repository.NewAuthRepository(db)

	t.Run("create and find user", func(t *testing.T) {
		hashed, _ := utils.HashPassword("Password123!")
		user := &models.User{
			FullName: "Repo Test User",
			Email:    "repo@example.com",
			Password: hashed,
		}

		if err := repo.Create(user); err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		found, err := repo.FindByEmail("repo@example.com")
		if err != nil {
			t.Fatalf("FindByEmail failed: %v", err)
		}
		if found.ID != user.ID {
			t.Errorf("Expected ID %d, got %d", user.ID, found.ID)
		}
		if found.Email != "repo@example.com" {
			t.Errorf("Expected email repo@example.com, got %s", found.Email)
		}
	})

	t.Run("exists by email", func(t *testing.T) {
		exists, err := repo.ExistsByEmail("repo@example.com")
		if err != nil {
			t.Fatalf("ExistsByEmail failed: %v", err)
		}
		if !exists {
			t.Fatal("Expected user to exist")
		}

		exists, err = repo.ExistsByEmail("nonexistent@example.com")
		if err != nil {
			t.Fatalf("ExistsByEmail failed: %v", err)
		}
		if exists {
			t.Fatal("Expected user to not exist")
		}
	})
}

func TestUtils(t *testing.T) {
	t.Run("hash and check password", func(t *testing.T) {
		password := "TestPassword123!"
		hash, err := utils.HashPassword(password)
		if err != nil {
			t.Fatalf("HashPassword failed: %v", err)
		}
		if hash == password {
			t.Fatal("Hash should not equal password")
		}

		if !utils.CheckPasswordHash(password, hash) {
			t.Fatal("CheckPasswordHash should return true for correct password")
		}
		if utils.CheckPasswordHash("wrong", hash) {
			t.Fatal("CheckPasswordHash should return false for wrong password")
		}
	})

	t.Run("email validation", func(t *testing.T) {
		if !utils.IsValidEmail("test@example.com") {
			t.Fatal("Valid email should pass")
		}
		if utils.IsValidEmail("invalid") {
			t.Fatal("Invalid email should fail")
		}
		// Go's mail.ParseAddress accepts "user@domain" without TLD
		if !utils.IsValidEmail("missing@domain") {
			t.Fatal("Go's mail.ParseAddress accepts user@domain without TLD")
		}
		if !utils.IsValidEmail("user@localhost") {
			t.Fatal("user@localhost should be valid")
		}
	})

	t.Run("strong password validation", func(t *testing.T) {
		if !utils.IsStrongPassword("Password123!") {
			t.Fatal("Strong password should pass")
		}
		if utils.IsStrongPassword("weak") {
			t.Fatal("Weak password should fail")
		}
		// Current implementation only requires letter + number, not special chars
		if !utils.IsStrongPassword("n0special") {
			t.Fatal("Password with letter + number should pass")
		}
		if utils.IsStrongPassword("NoNumbers!") {
			t.Fatal("Password without numbers should fail")
		}
		if utils.IsStrongPassword("nonumbers") {
			t.Fatal("Password without numbers should fail")
		}
	})
}

func TestUUID(t *testing.T) {
	id := uuid.New()
	if id == uuid.Nil {
		t.Fatal("UUID should not be nil")
	}

	parsed, err := uuid.Parse(id.String())
	if err != nil {
		t.Fatalf("Failed to parse UUID: %v", err)
	}
	if parsed != id {
		t.Fatal("Parsed UUID should match original")
	}
}