package middleware

import (
	"net/http"
	"strings"

	"backend/models"

	"github.com/golang-jwt/jwt/v5"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

func JWTAuth(db *gorm.DB, jwtKey []byte) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header required"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid authorization format"})
			return
		}

		tokenString := parts[1]
		claims := &jwt.RegisteredClaims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtKey, nil
		})

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid or expired token"})
			return
		}

		var userID uint
		if claims.Subject != "" {
			if id, err := parseUint(claims.Subject); err == nil {
				userID = id
			}
		}

		if userID == 0 {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
			return
		}

		var user models.User
		if err := db.First(&user, userID).Error; err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "User not found"})
			return
		}

		c.Set("user", &user)
		c.Set("userID", userID)
		c.Next()
	}
}

func parseUint(s string) (uint, error) {
	var result uint
	for _, c := range s {
		if c < '0' || c > '9' {
			return 0, errInvalidUint
		}
		result = result*10 + uint(c-'0')
	}
	return result, nil
}

var errInvalidUint = &parseError{}

type parseError struct{}

func (e *parseError) Error() string {
	return "invalid uint"
}

func GetUserFromContext(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("user")
	if !exists {
		return nil, false
	}
	return user.(*models.User), true
}

func GetUserIDFromContext(c *gin.Context) (uint, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return 0, false
	}
	return userID.(uint), true
}