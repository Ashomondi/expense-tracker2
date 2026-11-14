package handlers

import (
	"encoding/json"
	"net/http"
	"strings"
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

	// Validate required fields
	if strings.TrimSpace(input.Title) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Title is required"})
		return
	}

	if input.Amount <= 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Amount must be greater than zero"})
		return
	}

	if strings.TrimSpace(input.Category) == "" {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Category is required"})
		return
	}

	parsedDate, err := time.Parse("2006-01-02", input.Date)
	if err != nil {
		parsedDate = time.Now()
	}

	currency := strings.TrimSpace(input.Currency)
	if currency == "" {
		currency = "KES"
	}

	expense := models.Expense{
		UserID:   user.ID,
		Title:    strings.TrimSpace(input.Title),
		Amount:   input.Amount,
		Category: strings.TrimSpace(input.Category),
		Currency: currency,
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

// Delete Expense
func (h *ExpenseHandler) DeleteExpense(w http.ResponseWriter, r *http.Request) {
	user, err := utils.GetUserFromCookie(r, h.DB, h.JWTKey)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var input struct {
		ID uint `json:"id"`
	}

	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	result := h.DB.Where("id = ? AND user_id = ?", input.ID, user.ID).Delete(&models.Expense{})
	if result.Error != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete expense"})
		return
	}

	if result.RowsAffected == 0 {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]string{"error": "Expense not found"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Expense deleted"})
}

// GetMonthlySummary godoc
// @Summary Get monthly summary of user's expenses
// @Description Get current month's totals, average daily spend, category totals, and month-over-month comparisons
// @Tags expenses
// @Accept json
// @Produce json
// @Success 200 {object} models.MonthlySummaryResponse
// @Router /expenses/summary [get]
func (h *ExpenseHandler) GetMonthlySummary(w http.ResponseWriter, r *http.Request) {
	user, err := utils.GetUserFromCookie(r, h.DB, h.JWTKey)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	now := time.Now()
	startOfMonth := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, now.Location())
	endOfMonth := startOfMonth.AddDate(0, 1, 0).Add(-time.Second)

	var expenses []models.Expense
	if err := h.DB.Where("user_id = ? AND date BETWEEN ? AND ?", user.ID, startOfMonth, endOfMonth).Order("date asc").Find(&expenses).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch monthly summary"})
		return
	}

	var totalAmount float64
	categoryTotals := make(map[string]float64)
	for _, expense := range expenses {
		totalAmount += expense.Amount
		categoryTotals[expense.Category] += expense.Amount
	}

	previousMonthStart := startOfMonth.AddDate(0, -1, 0)
	previousMonthEnd := previousMonthStart.AddDate(0, 1, 0).Add(-time.Second)
	var previousMonthTotal float64
	if err := h.DB.Model(&models.Expense{}).Where("user_id = ? AND date BETWEEN ? AND ?", user.ID, previousMonthStart, previousMonthEnd).Select("COALESCE(SUM(amount), 0)").Scan(&previousMonthTotal).Error; err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to compute previous month comparison"})
		return
	}

	averageDailySpend := 0.0
	if endOfMonth.Day() > 0 {
		averageDailySpend = totalAmount / float64(endOfMonth.Day())
	}

	comparisonPct := 0.0
	if previousMonthTotal > 0 {
		comparisonPct = ((totalAmount - previousMonthTotal) / previousMonthTotal) * 100
	}

	response := models.MonthlySummaryResponse{
		TotalAmount:          totalAmount,
		AverageDailySpend:    averageDailySpend,
		CategoryTotals:       categoryTotals,
		PreviousMonthTotal:   previousMonthTotal,
		ComparisonPct:        comparisonPct,
		MonthOverMonthChange: totalAmount - previousMonthTotal,
		TransactionCount:     len(expenses),
		TotalCount:           int64(len(expenses)),
		Month:                int(now.Month()),
		Year:                 now.Year(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}
