package utils

import (
	"net/http"
	"time"

	"backend/models"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// GenerateJWT creates a signed token for service-layer authentication.
func GenerateJWT(userID uint, secret string, expiration time.Duration) (string, error) {
	claims := jwt.MapClaims{
		"userId": userID,
		"exp":    time.Now().Add(expiration).Unix(),
		"iat":    time.Now().Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GetUserFromCookie extracts the authenticated user from the HTTP request cookie
func GetUserFromCookie(r *http.Request, db *gorm.DB, jwtKey []byte) (*models.User, error) {
	cookie, err := r.Cookie("spendly_token")
	if err != nil {
		return nil, err
	}

	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(cookie.Value, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}

	var user models.User
	if err := db.Where("email = ?", claims.Subject).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
