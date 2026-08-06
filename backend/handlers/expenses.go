package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"backend/models"
	"backend/utils"

	"gorm.io/gorm"
)

type ExpenseHandler struct {
	DB     *gorm.DB
	JWTKey []byte
}

func NewExpenseHandler(db *gorm.DB, jwtKey []byte) *ExpenseHandler {
	return &ExpenseHandler{DB: db, JWTKey: jwtKey}
}

// Get User's Expenses
func (h *ExpenseHandler) GetExpenses(w http.ResponseWriter, r *http.Request) {
	user, err := utils.GetUserFromCookie(r, h.DB, h.JWTKey)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var expenses []models.Expense
	h.DB.Where("user_id = ?", user.ID).Order("date desc").Find(&expenses)

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(expenses)
}

// Create New Expense
func (h *ExpenseHandler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	user, err := utils.GetUserFromCookie(r, h.DB, h.JWTKey)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var input models.CreateExpenseInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		parsedDate = time.Now()
	}

	expense := models.Expense{
		UserID:   user.ID,
		Title:    input.Title,
		Amount:   input.Amount,
		Category: input.Category,
		Date:     parsedDate,
	}

	if err := h.DB.Create(&expense).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to create expense"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}