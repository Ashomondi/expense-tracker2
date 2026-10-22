package tests

import (
	"testing"
	"time"

	"backend/models"
	"backend/repository"
	"backend/services"
)

func TestExpenseRepository(t *testing.T) {
	t.Run("create and find expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		expense := &models.Expense{
			UserID:   user.ID,
			Title:    "Test Expense",
			Amount:   100.50,
			Category: "Food & Drink",
			Currency: "KES",
			Date:     time.Now(),
		}

		if err := repo.Create(expense); err != nil {
			t.Fatalf("Create failed: %v", err)
		}
		if expense.ID == 0 {
			t.Fatal("Expense ID should be set after create")
		}

		found, err := repo.FindByID(expense.ID)
		if err != nil {
			t.Fatalf("FindByID failed: %v", err)
		}
		if found.Title != "Test Expense" {
			t.Errorf("Expected title Test Expense, got %s", found.Title)
		}
		if found.Amount != 100.50 {
			t.Errorf("Expected amount 100.50, got %f", found.Amount)
		}
		if found.UserID != user.ID {
			t.Errorf("Expected user ID %d, got %d", user.ID, found.UserID)
		}
	})

	t.Run("find by user ID", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		expenses := []*models.Expense{
			{UserID: user.ID, Title: "Expense 1", Amount: 50, Category: "Food & Drink", Currency: "KES", Date: time.Now()},
			{UserID: user.ID, Title: "Expense 2", Amount: 75, Category: "Transport", Currency: "KES", Date: time.Now()},
		}
		for _, e := range expenses {
			if err := repo.Create(e); err != nil {
				t.Fatalf("Create failed: %v", err)
			}
		}

		found, err := repo.FindByUserID(user.ID)
		if err != nil {
			t.Fatalf("FindByUserID failed: %v", err)
		}
		if len(found) != 2 {
			t.Errorf("Expected 2 expenses, got %d", len(found))
		}
	})

	t.Run("find by category", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		expense := &models.Expense{
			UserID:   user.ID,
			Title:    "Coffee",
			Amount:   5,
			Category: "Food & Drink",
			Currency: "KES",
			Date:     time.Now(),
		}
		if err := repo.Create(expense); err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		found, err := repo.FindByUserIDAndCategory(user.ID, "Food & Drink")
		if err != nil {
			t.Fatalf("FindByUserIDAndCategory failed: %v", err)
		}
		if len(found) == 0 {
			t.Fatal("Expected at least one expense in Food & Drink category")
		}
		for _, e := range found {
			if e.Category != "Food & Drink" {
				t.Errorf("Expected category Food & Drink, got %s", e.Category)
			}
		}
	})

	t.Run("update expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		expense := &models.Expense{
			UserID:   user.ID,
			Title:    "Original",
			Amount:   100,
			Category: "Food & Drink",
			Currency: "KES",
			Date:     time.Now(),
		}
		if err := repo.Create(expense); err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		expense.Title = "Updated"
		expense.Amount = 150
		if err := repo.Update(expense); err != nil {
			t.Fatalf("Update failed: %v", err)
		}

		found, err := repo.FindByID(expense.ID)
		if err != nil {
			t.Fatalf("FindByID failed: %v", err)
		}
		if found.Title != "Updated" {
			t.Errorf("Expected title Updated, got %s", found.Title)
		}
		if found.Amount != 150 {
			t.Errorf("Expected amount 150, got %f", found.Amount)
		}
	})

	t.Run("delete expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		expense := &models.Expense{
			UserID:   user.ID,
			Title:    "To Delete",
			Amount:   200,
			Category: "Food & Drink",
			Currency: "KES",
			Date:     time.Now(),
		}
		if err := repo.Create(expense); err != nil {
			t.Fatalf("Create failed: %v", err)
		}

		if err := repo.Delete(expense.ID, user.ID); err != nil {
			t.Fatalf("Delete failed: %v", err)
		}

		_, err := repo.FindByID(expense.ID)
		if err != repository.ErrExpenseNotFound {
			t.Fatalf("Expected ErrExpenseNotFound, got %v", err)
		}
	})

	t.Run("delete non-existent expense fails", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		repo := repository.NewExpenseRepository(db)

		err := repo.Delete(99999, user.ID)
		if err != repository.ErrExpenseNotFound {
			t.Fatalf("Expected ErrExpenseNotFound, got %v", err)
		}
	})
}

func TestExpenseService(t *testing.T) {
	t.Run("create expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Service Test Expense",
			Amount:   250.75,
			Category: "Shopping",
			Currency: "USD",
			Date:     time.Now().Format("2006-01-02"),
		}

		expense, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		if expense.Title != "Service Test Expense" {
			t.Errorf("Expected title Service Test Expense, got %s", expense.Title)
		}
		if expense.Amount != 250.75 {
			t.Errorf("Expected amount 250.75, got %f", expense.Amount)
		}
		if expense.Category != "Shopping" {
			t.Errorf("Expected category Shopping, got %s", expense.Category)
		}
		if expense.Currency != "USD" {
			t.Errorf("Expected currency USD, got %s", expense.Currency)
		}
	})

	t.Run("create expense with empty title fails", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "",
			Amount:   100,
			Category: "Food & Drink",
		}

		_, err := expenseService.CreateExpense(user.ID, input)
		if err == nil {
			t.Fatal("Expected error for empty title")
		}
	})

	t.Run("create expense with zero amount fails", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Zero Amount",
			Amount:   0,
			Category: "Food & Drink",
		}

		_, err := expenseService.CreateExpense(user.ID, input)
		if err == nil {
			t.Fatal("Expected error for zero amount")
		}
	})

	t.Run("create expense with negative amount fails", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Negative Amount",
			Amount:   -50,
			Category: "Food & Drink",
		}

		_, err := expenseService.CreateExpense(user.ID, input)
		if err == nil {
			t.Fatal("Expected error for negative amount")
		}
	})

	t.Run("create expense with empty category fails", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "No Category",
			Amount:   100,
			Category: "",
		}

		_, err := expenseService.CreateExpense(user.ID, input)
		if err == nil {
			t.Fatal("Expected error for empty category")
		}
	})

	t.Run("get user expenses", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		for i := 0; i < 3; i++ {
			input := models.CreateExpenseInput{
				Title:    "Expense",
				Amount:   float64(100 + i*50),
				Category: "Food & Drink",
			}
			if _, err := expenseService.CreateExpense(user.ID, input); err != nil {
				t.Fatalf("CreateExpense failed: %v", err)
			}
		}

		expenses, err := expenseService.GetUserExpenses(user.ID)
		if err != nil {
			t.Fatalf("GetUserExpenses failed: %v", err)
		}
		if len(expenses) != 3 {
			t.Errorf("Expected 3 expenses, got %d", len(expenses))
		}
	})

	t.Run("get expense by ID", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Get By ID Test",
			Amount:   300,
			Category: "Entertainment",
		}
		created, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		found, err := expenseService.GetExpenseByID(user.ID, created.ID)
		if err != nil {
			t.Fatalf("GetExpenseByID failed: %v", err)
		}
		if found.ID != created.ID {
			t.Errorf("Expected ID %d, got %d", created.ID, found.ID)
		}
	})

	t.Run("get expense by ID fails for other user", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		otherUser := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Other User Expense",
			Amount:   400,
			Category: "Health",
		}
		created, err := expenseService.CreateExpense(otherUser.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		_, err = expenseService.GetExpenseByID(user.ID, created.ID)
		if err != services.ErrExpenseNotFound {
			t.Fatalf("Expected ErrExpenseNotFound, got %v", err)
		}
	})

	t.Run("update expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Before Update",
			Amount:   100,
			Category: "Food & Drink",
		}
		created, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		updateInput := models.CreateExpenseInput{
			Title:    "After Update",
			Amount:   200,
			Category: "Transport",
		}
		updated, err := expenseService.UpdateExpense(user.ID, created.ID, updateInput)
		if err != nil {
			t.Fatalf("UpdateExpense failed: %v", err)
		}
		if updated.Title != "After Update" {
			t.Errorf("Expected title After Update, got %s", updated.Title)
		}
		if updated.Amount != 200 {
			t.Errorf("Expected amount 200, got %f", updated.Amount)
		}
		if updated.Category != "Transport" {
			t.Errorf("Expected category Transport, got %s", updated.Category)
		}
	})

	t.Run("delete expense", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "To Delete",
			Amount:   500,
			Category: "Utilities",
		}
		created, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		if err := expenseService.DeleteExpense(user.ID, created.ID); err != nil {
			t.Fatalf("DeleteExpense failed: %v", err)
		}

		_, err = expenseService.GetExpenseByID(user.ID, created.ID)
		if err != services.ErrExpenseNotFound {
			t.Fatalf("Expected ErrExpenseNotFound, got %v", err)
		}
	})

	t.Run("get expenses by category", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		categories := []string{"Food & Drink", "Transport", "Entertainment"}
		for _, cat := range categories {
			input := models.CreateExpenseInput{
				Title:    cat + " Expense",
				Amount:   100,
				Category: cat,
			}
			if _, err := expenseService.CreateExpense(user.ID, input); err != nil {
				t.Fatalf("CreateExpense failed: %v", err)
			}
		}

		foodExpenses, err := expenseService.GetExpensesByCategory(user.ID, "Food & Drink")
		if err != nil {
			t.Fatalf("GetExpensesByCategory failed: %v", err)
		}
		for _, e := range foodExpenses {
			if e.Category != "Food & Drink" {
				t.Errorf("Expected category Food & Drink, got %s", e.Category)
			}
		}
	})

	t.Run("get category breakdown", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		input := models.CreateExpenseInput{
			Title:    "Breakdown Test",
			Amount:   100,
			Category: "Food & Drink",
		}
		if _, err := expenseService.CreateExpense(user.ID, input); err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		breakdown, err := expenseService.GetCategoryBreakdown(user.ID)
		if err != nil {
			t.Fatalf("GetCategoryBreakdown failed: %v", err)
		}

		if breakdown["Food & Drink"] == 0 {
			t.Errorf("Expected Food & Drink expenses > 0")
		}
	})

	t.Run("get monthly summary", func(t *testing.T) {
		db := SetupTestDB(t)
		user := CreateUniqueTestUser(t, db)
		expenseRepo := repository.NewExpenseRepository(db)
		expenseService := services.NewExpenseService(expenseRepo)

		now := time.Now()
		input := models.CreateExpenseInput{
			Title:    "Monthly Test",
			Amount:   500,
			Category: "Food & Drink",
			Date:     now.Format("2006-01-02"),
		}
		if _, err := expenseService.CreateExpense(user.ID, input); err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		summary, err := expenseService.GetMonthlySummary(user.ID, now.Year(), int(now.Month()))
		if err != nil {
			t.Fatalf("GetMonthlySummary failed: %v", err)
		}

		total := summary["total"].(float64)
		if total < 500 {
			t.Errorf("Expected total >= 500, got %f", total)
		}

		categoryTotals := summary["category_totals"].(map[string]float64)
		if categoryTotals["Food & Drink"] < 500 {
			t.Errorf("Expected Food & Drink >= 500, got %f", categoryTotals["Food & Drink"])
		}
	})
}

func TestExpenseService_DateParsing(t *testing.T) {
	db := SetupTestDB(t)
	user := CreateUniqueTestUser(t, db)
	expenseRepo := repository.NewExpenseRepository(db)
	expenseService := services.NewExpenseService(expenseRepo)

	t.Run("valid date string", func(t *testing.T) {
		input := models.CreateExpenseInput{
			Title:    "With Date",
			Amount:   100,
			Category: "Food & Drink",
			Date:     "2024-12-25",
		}

		expense, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		expectedDate := time.Date(2024, 12, 25, 0, 0, 0, 0, time.UTC)
		if !expense.Date.Equal(expectedDate) {
			t.Errorf("Expected date 2024-12-25, got %v", expense.Date)
		}
	})

	t.Run("invalid date string uses current date", func(t *testing.T) {
		before := time.Now().Add(-time.Second)
		input := models.CreateExpenseInput{
			Title:    "Invalid Date",
			Amount:   100,
			Category: "Food & Drink",
			Date:     "not-a-date",
		}

		expense, err := expenseService.CreateExpense(user.ID, input)
		if err != nil {
			t.Fatalf("CreateExpense failed: %v", err)
		}

		after := time.Now().Add(time.Second)
		if expense.Date.Before(before) || expense.Date.After(after) {
			t.Errorf("Expected date to be near current time, got %v", expense.Date)
		}
	})
}