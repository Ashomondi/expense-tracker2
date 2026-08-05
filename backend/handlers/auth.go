package handlers

import (
	"errors"
	"net/http"

	"expense-tracker2/backend/services"
	"expense-tracker2/backend/utils"

	"github.com/gin-gonic/gin"
)

// AuthHandler groups HTTP handlers for authentication endpoints.
type AuthHandler struct {
	service services.AuthService
}

// NewAuthHandler constructs an AuthHandler.
func NewAuthHandler(service services.AuthService) *AuthHandler {
	return &AuthHandler{service: service}
}

type signupRequest struct {
	Name     string `json:"name" binding:"required"`
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Signup handles POST /signup
func (h *AuthHandler) Signup(c *gin.Context) {
	var req signupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, utils.FormatValidationError(err))
		return
	}

	result, err := h.service.Signup(services.SignupInput{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		h.respondAuthError(c, err)
		return
	}

	utils.Success(c, http.StatusCreated, gin.H{
		"user":  result.User,
		"token": result.Token,
	})
}

// Login handles POST /login
func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		utils.Error(c, http.StatusBadRequest, utils.FormatValidationError(err))
		return
	}

	result, err := h.service.Login(services.LoginInput{
		Email:    req.Email,
		Password: req.Password,
	})
	if err != nil {
		h.respondAuthError(c, err)
		return
	}

	utils.Success(c, http.StatusOK, gin.H{
		"user":  result.User,
		"token": result.Token,
	})
}

// respondAuthError maps known service-layer errors to the right HTTP status.
func (h *AuthHandler) respondAuthError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrEmailTaken):
		utils.Error(c, http.StatusConflict, err.Error())
	case errors.Is(err, services.ErrInvalidCredentials):
		utils.Error(c, http.StatusUnauthorized, err.Error())
	default:
		utils.Error(c, http.StatusBadRequest, err.Error())
	}
}