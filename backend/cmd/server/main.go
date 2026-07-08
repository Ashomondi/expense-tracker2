package routes

import (
    "expense-tracker/handlers"
    "expense-tracker/middleware"
    "net/http"
)

func SetupRoutes(authHandler *handlers.AuthHandler, expenseHandler *handlers.ExpenseHandler) *http.ServeMux {
    mux := http.NewServeMux()

    mux.HandleFunc("/api/register", authHandler.Register)
    mux.HandleFunc("/api/login", authHandler.Login)

    mux.Handle("/api/expenses", middleware.JWTAuth(http.HandlerFunc(expenseHandler.GetExpenses)))

    return mux
}
