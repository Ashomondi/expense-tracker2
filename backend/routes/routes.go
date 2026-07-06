package routes

import (
	"expense-tracker/handlers"
    "expense-tracker/middleware"
    "net/http"
)
func SetUpRoutes (authHandler *handlers.AuthHandler, expenseHandler *handlers.ExpenseHandler) *http.ServeMux {
	mux := http.NewServeMux() 
	mux.Handlefunc("/api/register", authHandler.Register)
	mux.Handlefunc("/api/login", authHandler.Login)
	mux.Handle("/api/expenses", middleware.JWTAuth(http.HandlerFunc(expenseHandler.Getexpenses)))
	return mux
}