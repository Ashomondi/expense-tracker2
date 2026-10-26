package utils

import (
	"encoding/json"
	"net/http"
)

type APIResponse struct {
	Success bool        `json:"success"`
	Data    interface{} `json:"data,omitempty"`
	Error   string      `json:"error,omitempty"`
	Message string      `json:"message,omitempty"`
}

func WriteJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

func WriteSuccess(w http.ResponseWriter, data interface{}, message string) {
	WriteJSON(w, http.StatusOK, APIResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

func WriteCreated(w http.ResponseWriter, data interface{}, message string) {
	WriteJSON(w, http.StatusCreated, APIResponse{
		Success: true,
		Data:    data,
		Message: message,
	})
}

func WriteError(w http.ResponseWriter, status int, errorMsg string) {
	WriteJSON(w, status, APIResponse{
		Success: false,
		Error:   errorMsg,
	})
}

func WriteBadRequest(w http.ResponseWriter, errorMsg string) {
	WriteError(w, http.StatusBadRequest, errorMsg)
}

func WriteUnauthorized(w http.ResponseWriter, errorMsg string) {
	WriteError(w, http.StatusUnauthorized, errorMsg)
}

func WriteNotFound(w http.ResponseWriter, errorMsg string) {
	WriteError(w, http.StatusNotFound, errorMsg)
}

func WriteInternalError(w http.ResponseWriter, errorMsg string) {
	WriteError(w, http.StatusInternalServerError, errorMsg)
}