package tests

import (
	"testing"

	"backend/models"
	"backend/services"
)

func TestMpesaParser_Sent(t *testing.T) {
	parser := services.NewMpesaParser()

	testCases := []struct {
		name     string
		input    string
		expected *models.MpesaParserResult
	}{
		{
			name: "standard sent message",
			input: "KSh1,500.00 sent to JOHN DOE 254712345678 on 22/10/23 at 10:30. Ref: ABC123XYZ. Fee: KSh25.00. Balance: KSh5,000.00",
			expected: &models.MpesaParserResult{
				TransactionType: "sent",
				Amount:          1500.00,
				Fee:             25.00,
				Balance:         5000.00,
				Recipient:       "JOHN DOE",
				PhoneNumber:     "712345678",
				Confidence:      0.9,
			},
		},
		{
			name: "you sent format",
			input: "You sent KSh2,000.00 to JANE SMITH on 23/10/23 at 14:00. Ref: DEF456UVW. Fee: KSh0.00. Balance: KSh3,000.00",
			expected: &models.MpesaParserResult{
				TransactionType: "sent",
				Amount:          2000.00,
				Recipient:       "JANE SMITH",
				Confidence:      0.9,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := parser.Parse(tc.input)
			if result == nil {
				t.Fatal("expected parse result, got nil")
			}
			if result.TransactionType != tc.expected.TransactionType {
				t.Errorf("expected type %s, got %s", tc.expected.TransactionType, result.TransactionType)
			}
			if result.Amount != tc.expected.Amount {
				t.Errorf("expected amount %.2f, got %.2f", tc.expected.Amount, result.Amount)
			}
			if tc.expected.Fee > 0 && result.Fee != tc.expected.Fee {
				t.Errorf("expected fee %.2f, got %.2f", tc.expected.Fee, result.Fee)
			}
			if tc.expected.Balance > 0 && result.Balance != tc.expected.Balance {
				t.Errorf("expected balance %.2f, got %.2f", tc.expected.Balance, result.Balance)
			}
			if tc.expected.Recipient != "" && result.Recipient != tc.expected.Recipient {
				t.Errorf("expected recipient %s, got %s", tc.expected.Recipient, result.Recipient)
			}
			if tc.expected.PhoneNumber != "" && result.PhoneNumber != tc.expected.PhoneNumber {
				t.Errorf("expected phone %s, got %s", tc.expected.PhoneNumber, result.PhoneNumber)
			}
		})
	}
}

func TestMpesaParser_Received(t *testing.T) {
	parser := services.NewMpesaParser()

	testCases := []struct {
		name     string
		input    string
		expected *models.MpesaParserResult
	}{
		{
			name: "standard received message",
			input: "You have received KSh2,000.00 from JANE SMITH 254798765432 on 22/10/23 at 14:15. Ref: DEF456UVW. Balance: KSh7,000.00",
			expected: &models.MpesaParserResult{
				TransactionType: "received",
				Amount:          2000.00,
				Balance:         7000.00,
				Sender:          "JANE SMITH",
				PhoneNumber:     "798765432",
				Confidence:      0.9,
			},
		},
	}

	for _, tc := range testCases {
		t.Run(tc.name, func(t *testing.T) {
			result := parser.Parse(tc.input)
			if result == nil {
				t.Fatal("expected parse result, got nil")
			}
			if result.TransactionType != tc.expected.TransactionType {
				t.Errorf("expected type %s, got %s", tc.expected.TransactionType, result.TransactionType)
			}
			if result.Amount != tc.expected.Amount {
				t.Errorf("expected amount %.2f, got %.2f", tc.expected.Amount, result.Amount)
			}
		})
	}
}

func TestMpesaParser_PayBill(t *testing.T) {
	parser := services.NewMpesaParser()

	input := "KSh500.00 paid to KENYA POWER paybill 888888 on 21/10/23. Ref: GHI789RST. Fee: KSh0.00. Balance: KSh6,500.00"
	result := parser.Parse(input)

	if result == nil {
		t.Fatal("expected parse result, got nil")
	}
	if result.TransactionType != "paybill" {
		t.Errorf("expected type paybill, got %s", result.TransactionType)
	}
	if result.Amount != 500.00 {
		t.Errorf("expected amount 500.00, got %.2f", result.Amount)
	}
	if result.Recipient != "KENYA POWER" {
		t.Errorf("expected recipient KENYA POWER, got %s", result.Recipient)
	}
}

func TestMpesaParser_BuyGoods(t *testing.T) {
	parser := services.NewMpesaParser()

	input := "KSh1,200.00 paid to NAIVAS SUPERMARKET till 123456 on 20/10/23 at 16:30. Ref: JKL012MNO. Fee: KSh0.00. Balance: KSh5,300.00"
	result := parser.Parse(input)

	if result == nil {
		t.Fatal("expected parse result, got nil")
	}
	if result.TransactionType != "buy_goods" {
		t.Errorf("expected type buy_goods, got %s", result.TransactionType)
	}
	if result.Amount != 1200.00 {
		t.Errorf("expected amount 1200.00, got %.2f", result.Amount)
	}
}

func TestMpesaParser_Withdrawal(t *testing.T) {
	parser := services.NewMpesaParser()

	input := "KSh3,000.00 withdrawn from agent SAFARICOM AGENT on 19/10/23. Ref: MNO345PQR. Fee: KSh50.00. Balance: KSh2,300.00"
	result := parser.Parse(input)

	if result == nil {
		t.Fatal("expected parse result, got nil")
	}
	if result.TransactionType != "withdrawal" {
		t.Errorf("expected type withdrawal, got %s", result.TransactionType)
	}
	if result.Amount != 3000.00 {
		t.Errorf("expected amount 3000.00, got %.2f", result.Amount)
	}
	if result.Fee != 50.00 {
		t.Errorf("expected fee 50.00, got %.2f", result.Fee)
	}
}

func TestMpesaParser_Airtime(t *testing.T) {
	parser := services.NewMpesaParser()

	input := "KSh100.00 bought airtime on 18/10/23 at 09:00. Ref: STU678VWX. Balance: KSh2,200.00"
	result := parser.Parse(input)

	if result == nil {
		t.Fatal("expected parse result, got nil")
	}
	if result.TransactionType != "airtime" {
		t.Errorf("expected type airtime, got %s", result.TransactionType)
	}
	if result.Amount != 100.00 {
		t.Errorf("expected amount 100.00, got %.2f", result.Amount)
	}
	if result.Recipient != "Airtime" {
		t.Errorf("expected recipient Airtime, got %s", result.Recipient)
	}
}

func TestMpesaParser_Reversal(t *testing.T) {
	parser := services.NewMpesaParser()

	input := "Reversal of KSh1,500.00 sent to JOHN DOE. Ref: REV123ABC. Balance: KSh3,700.00"
	result := parser.Parse(input)

	if result == nil {
		t.Fatal("expected parse result, got nil")
	}
	if result.TransactionType != "reversal" {
		t.Errorf("expected type reversal, got %s", result.TransactionType)
	}
	if result.Amount != 1500.00 {
		t.Errorf("expected amount 1500.00, got %.2f", result.Amount)
	}
}

func TestMpesaParser_NonMpesa(t *testing.T) {
	parser := services.NewMpesaParser()

	testCases := []string{
		"Hello world",
		"Your OTP is 123456",
		"Meeting at 3pm tomorrow",
		"",
		"Random message without mpesa keywords",
	}

	for _, input := range testCases {
		result := parser.Parse(input)
		if result == nil {
			continue
		}
		if result.Confidence > 0.5 {
			t.Errorf("non-mpesa message '%s' should have low confidence, got %.2f", input, result.Confidence)
		}
	}
}

func TestMpesaParser_Batch(t *testing.T) {
	parser := services.NewMpesaParser()

	messages := []string{
		"KSh1,500.00 sent to JOHN DOE on 22/10/23. Ref: ABC123XYZ.",
		"You have received KSh2,000.00 from JANE SMITH on 22/10/23. Ref: DEF456UVW.",
		"Hello world",
	}

	results := parser.ParseBatch(messages)

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	if results[0].TransactionType != "sent" {
		t.Errorf("first message should be sent, got %s", results[0].TransactionType)
	}
	if results[1].TransactionType != "received" {
		t.Errorf("second message should be received, got %s", results[1].TransactionType)
	}
	if results[2].Confidence > 0.5 {
		t.Errorf("third message should have low confidence")
	}
}