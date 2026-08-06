package handlers

import (
	"encoding/json"
	"net/http"
	"backend/models"
	"gorm.io/gorm"
)

type BudgetHandler struct {
	DB     *gorm.DB
	JWTKey []byte
}

func NewBudgetHandler(db *gorm.DB, jwtKey []byte) *BudgetHandler {
	return &BudgetHandler{DB: db, JWTKey: jwtKey}
}

func (h *BudgetHandler) GetBudgets(w http.ResponseWriter, r *http.Request) {
	user, err := h.getUserFromCookie(r) // Use your cookie auth helper
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var budgets []models.Budget
	h.DB.Where("user_id = ?", user.ID).Find(&budgets)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(budgets)
}

func (h *BudgetHandler) SetBudget(w http.ResponseWriter, r *http.Request) {
	user, err := h.getUserFromCookie(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		return
	}

	var req struct {
		Category string  `json:"category"`
		Amount   float64 `json:"amount"`
	}

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	var budget models.Budget
	result := h.DB.Where("user_id = ? AND category = ?", user.ID, req.Category).First(&budget)

	if result.Error != nil {
		budget = models.Budget{
			UserID:   user.ID,
			Category: req.Category,
			Amount:   req.Amount,
		}
		h.DB.Create(&budget)
	} else {
		budget.Amount = req.Amount
		h.DB.Save(&budget)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(budget)
}