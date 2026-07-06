package handlers

import (
	"encoding/json"
    "expense-tracker/models"
    "expense-tracker/services"
    "expense-tracker/utils"
    "net/http"
)

type AuthHandler strict {
	Service service.AuthService
}

func (h *AuthHandler) Register(w http.ResponseWritter,r *http.Request) {
	var input models.RegisterInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.ErrorResponse(w, http.StatusBadRequest, "Invalid request payload")
		return
	}
	if err := h.Service.Register(input); err != nil {
		utils.ErrorResponse(w, http.StatusInternalServerError, err.Error())
		return
	}
	utils.SuccessResponse(w, http.StatusCreated, "User registered successfully", nil)
}