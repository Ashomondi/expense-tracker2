package tests

import (
	"testing"

	"backend/models"
	"backend/services"
)

func TestStatementParserCSV(t *testing.T) {
	parser := services.NewStatementParser()

	csvContent := `Customer Statement
Customer Name: Ashley Omondi
Mobile Number: 254712345678

Receipt No.,Completion Time,Details,Transaction Status,Paid In,Withdrawn,Balance
QK87XYZ123,2026-10-25 14:32:10,Customer Transfer to 254711122233 - John Doe,Completed,,500.00,1250.00
QK88ABC456,2026-10-25 12:10:00,Pay Bill to 888880 - KPLC PREPAID Acc. 123456789,Completed,,1000.00,1750.00
QK89DEF789,2026-10-24 09:15:30,Funds received from 254799887766 - Jane Doe,Completed,2500.00,,2750.00
QK90GHI012,2026-10-23 18:45:00,Merchant Payment to 123456 - Naivas Supermarket,Completed,,3200.00,250.00
QK91JKL345,2026-10-22 08:30:15,Customer Withdrawal At Agent 543210 - QuickMart,Completed,,2000.00,3450.00
QK92MNO678,2026-10-21 11:05:00,Airtime Purchase,Completed,,100.00,5450.00
`

	result, err := parser.ParseStatement([]byte(csvContent), "statement.csv")
	if err != nil {
		t.Fatalf("Unexpected error parsing CSV statement: %v", err)
	}

	if result.TotalParsed != 6 {
		t.Fatalf("Expected 6 parsed transactions, got %d", result.TotalParsed)
	}

	// Verify sent transaction
	tx0 := result.Transactions[0]
	if tx0.TransactionRef != "QK87XYZ123" {
		t.Errorf("Expected Ref QK87XYZ123, got %s", tx0.TransactionRef)
	}
	if tx0.Amount != 500.00 {
		t.Errorf("Expected Amount 500.00, got %.2f", tx0.Amount)
	}
	if tx0.TransactionType != models.MpesaTypeSent {
		t.Errorf("Expected type sent, got %s", tx0.TransactionType)
	}

	// Verify paybill transaction
	tx1 := result.Transactions[1]
	if tx1.TransactionType != models.MpesaTypePayBill {
		t.Errorf("Expected type paybill, got %s", tx1.TransactionType)
	}
	if tx1.Amount != 1000.00 {
		t.Errorf("Expected Amount 1000.00, got %.2f", tx1.Amount)
	}

	// Verify received transaction
	tx2 := result.Transactions[2]
	if tx2.TransactionType != models.MpesaTypeReceived {
		t.Errorf("Expected type received, got %s", tx2.TransactionType)
	}
	if tx2.Amount != 2500.00 {
		t.Errorf("Expected Amount 2500.00, got %.2f", tx2.Amount)
	}

	// Verify buy goods transaction
	tx3 := result.Transactions[3]
	if tx3.TransactionType != models.MpesaTypeBuyGoods {
		t.Errorf("Expected type buy_goods, got %s", tx3.TransactionType)
	}
	if tx3.Amount != 3200.00 {
		t.Errorf("Expected Amount 3200.00, got %.2f", tx3.Amount)
	}
}

func TestStatementParserTextReport(t *testing.T) {
	parser := services.NewStatementParser()

	textContent := `
QK87XYZ123 2026-10-25 14:32:10 Customer Transfer to John Doe Completed -500.00 1,250.00
QK88ABC456 2026-10-25 12:10:00 Pay Bill to Kenya Power Completed -1000.00 1,750.00
`

	result, err := parser.ParseStatement([]byte(textContent), "statement.txt")
	if err != nil {
		t.Fatalf("Unexpected error parsing text statement: %v", err)
	}

	if result.TotalParsed != 2 {
		t.Fatalf("Expected 2 parsed transactions, got %d", result.TotalParsed)
	}

	if result.Transactions[0].Amount != 500.00 {
		t.Errorf("Expected Amount 500.00, got %.2f", result.Transactions[0].Amount)
	}
	if result.Transactions[1].Amount != 1000.00 {
		t.Errorf("Expected Amount 1000.00, got %.2f", result.Transactions[1].Amount)
	}
}
