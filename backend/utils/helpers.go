package utils

import (
	"net/http"

	"backend/models"

	"github.com/golang-jwt/jwt/v5"
	"gorm.io/gorm"
)

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