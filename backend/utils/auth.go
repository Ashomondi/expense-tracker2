package utils

import (
	"errors"
	"net/http"
	"strconv"
	"strings"
	"time"

	"backend/models"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

// GenerateJWT creates a signed token for service-layer authentication.
func GenerateJWT(userID uint, secret string, expiration time.Duration) (string, error) {
	claims := &jwt.RegisteredClaims{
		Subject:   strconv.FormatUint(uint64(userID), 10),
		ExpiresAt: jwt.NewNumericDate(time.Now().Add(expiration)),
		IssuedAt:  jwt.NewNumericDate(time.Now()),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(secret))
}

// GetUserFromCookie extracts the authenticated user from the HTTP request cookie or Authorization header.
// It supports both the current numeric user ID based tokens and older email-based tokens.
func GetUserFromCookie(r *http.Request, db *gorm.DB, jwtKey []byte) (*models.User, error) {
	var tokenStr string

	// 1. Try spendly_token cookie
	if cookie, err := r.Cookie("spendly_token"); err == nil && cookie.Value != "" {
		tokenStr = cookie.Value
	}

	// 2. Fall back to Authorization: Bearer <token>
	if tokenStr == "" {
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(strings.ToLower(authHeader), "bearer ") {
			tokenStr = strings.TrimSpace(authHeader[7:])
		}
	}

	if tokenStr == "" {
		return nil, errors.New("no authentication token provided")
	}

	claims := &jwt.RegisteredClaims{}
	token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
		return jwtKey, nil
	})
	if err != nil || !token.Valid {
		return nil, err
	}

	if claims.Subject != "" {
		if userID, err := strconv.ParseUint(claims.Subject, 10, 64); err == nil {
			var user models.User
			if err := db.First(&user, userID).Error; err == nil {
				return &user, nil
			}
		}
	}

	var user models.User
	if err := db.Where("email = ?", claims.Subject).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}
