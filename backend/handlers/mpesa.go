package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"strconv"

	"backend/models"
	"backend/services"
	"backend/utils"

	"gorm.io/gorm"
)

type MpesaHandler struct {
	DB         *gorm.DB
	JWTKey     []byte
	MpesaSvc   services.MpesaService
	ExpenseSvc services.ExpenseService
}

func NewMpesaHandler(db *gorm.DB, jwtKey []byte, mpesaSvc services.MpesaService, expenseSvc services.ExpenseService) *MpesaHandler {
	return &MpesaHandler{
		DB:         db,
		JWTKey:     jwtKey,
		MpesaSvc:   mpesaSvc,
		ExpenseSvc: expenseSvc,
	}
}

func (h *MpesaHandler) getUser(r *http.Request) (*models.User, error) {
	return utils.GetUserFromCookie(r, h.DB, h.JWTKey)
}

func (h *MpesaHandler) ImportTransactions(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		Transactions []models.MpesaImportInput `json:"transactions"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if len(req.Transactions) == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "No transactions provided"})
		return
	}

	result, err := h.MpesaSvc.ImportTransactions(user.ID, req.Transactions)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to import transactions"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

func (h *MpesaHandler) PreviewTransaction(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	if _, err := h.getUser(r); err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var input models.MpesaImportInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	preview, err := h.MpesaSvc.PreviewTransaction(input)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to preview transaction"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(preview)
}

func (h *MpesaHandler) GetImportHistory(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	limit := 50
	if l := r.URL.Query().Get("limit"); l != "" {
		if parsed, err := strconv.Atoi(l); err == nil && parsed > 0 {
			limit = parsed
		}
	}

	imports, err := h.MpesaSvc.GetImportHistory(user.ID, limit)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch import history"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(imports)
}

func (h *MpesaHandler) GetImportStats(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	stats, err := h.MpesaSvc.GetImportStats(user.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch import stats"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(stats)
}

func (h *MpesaHandler) GetImportStatus(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	stats, err := h.MpesaSvc.GetImportStats(user.ID)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to fetch import status"})
		return
	}

	recent, err := h.MpesaSvc.GetImportHistory(user.ID, 5)
	if err != nil {
		recent = []models.MpesaImport{}
	}

	response := map[string]interface{}{
		"stats":       stats,
		"recent":      recent,
		"integration": "mpesa-sms",
		"enabled":     true,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (h *MpesaHandler) CreateExpenseFromImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		ImportID uint `json:"import_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.ImportID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Import ID is required"})
		return
	}

	expense, err := h.MpesaSvc.CreateExpenseFromImport(user.ID, req.ImportID)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(expense)
}

func (h *MpesaHandler) DeleteImport(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodDelete {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var req struct {
		ImportID uint `json:"import_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Invalid request payload"})
		return
	}

	if req.ImportID == 0 {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": "Import ID is required"})
		return
	}

	if err := h.MpesaSvc.DeleteImport(user.ID, req.ImportID); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to delete import"})
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]string{"message": "Import deleted"})
}

func (h *MpesaHandler) UploadStatement(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	user, err := h.getUser(r)
	if err != nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]string{"error": "Unauthorized"})
		return
	}

	var fileBytes []byte
	var filename string

	// Support both multipart file upload and raw body upload
	contentType := r.Header.Get("Content-Type")
	if contentType != "" && len(contentType) >= 19 && contentType[:19] == "multipart/form-data" {
		if err := r.ParseMultipartForm(10 << 20); err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to parse multipart form"})
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Missing file field in upload"})
			return
		}
		defer file.Close()

		filename = header.Filename
		fileBytes, err = io.ReadAll(file)
		if err != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read uploaded file"})
			return
		}
	} else {
		// Read directly from body
		var err error
		fileBytes, err = io.ReadAll(r.Body)
		if err != nil {
			w.WriteHeader(http.StatusBadRequest)
			json.NewEncoder(w).Encode(map[string]string{"error": "Failed to read request body"})
			return
		}
		filename = "statement.csv"
	}

	preview, err := h.MpesaSvc.ParseStatement(fileBytes, filename)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		json.NewEncoder(w).Encode(map[string]string{"error": err.Error()})
		return
	}

	w.Header().Set("Content-Type", "application/json")

	// If preview mode requested, return parsed rows without committing to DB
	if r.URL.Query().Get("preview") == "true" {
		json.NewEncoder(w).Encode(models.MpesaStatementUploadResponse{
			Preview: preview,
			Message: "Statement preview generated successfully",
		})
		return
	}

	// Commit transactions to database
	importResult, err := h.MpesaSvc.ImportTransactions(user.ID, preview.Transactions)
	if err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]string{"error": "Failed to save statement transactions"})
		return
	}

	json.NewEncoder(w).Encode(models.MpesaStatementUploadResponse{
		Preview: preview,
		Import:  importResult,
		Message: "Statement transactions imported successfully",
	})
}
