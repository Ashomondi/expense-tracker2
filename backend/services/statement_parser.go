package services

import (
	"bytes"
	"encoding/csv"
	"fmt"
	"io"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend/models"
)

type StatementParser struct{}

func NewStatementParser() *StatementParser {
	return &StatementParser{}
}

func (sp *StatementParser) ParseStatement(data []byte, filename string) (*models.MpesaStatementPreviewResult, error) {
	result := &models.MpesaStatementPreviewResult{
		Transactions: make([]models.MpesaImportInput, 0),
		Warnings:     make([]string, 0),
	}

	trimmed := bytes.TrimSpace(data)
	if len(trimmed) == 0 {
		return result, fmt.Errorf("statement file is empty")
	}

	// Try CSV / TSV parsing first
	parsedCSV, err := sp.parseCSV(trimmed)
	if err == nil && len(parsedCSV) > 0 {
		result.Transactions = parsedCSV
		result.TotalParsed = len(parsedCSV)
		return result, nil
	}

	// Fallback: Line-by-line text parser for extracted PDF or text reports
	parsedText := sp.parseTextLines(string(trimmed))
	if len(parsedText) > 0 {
		result.Transactions = parsedText
		result.TotalParsed = len(parsedText)
		return result, nil
	}

	if err != nil {
		return nil, fmt.Errorf("unable to parse statement: %w", err)
	}

	return result, fmt.Errorf("no valid M-Pesa transactions found in the uploaded statement")
}

func (sp *StatementParser) parseCSV(data []byte) ([]models.MpesaImportInput, error) {
	lines := strings.Split(string(data), "\n")
	headerIndex := -1
	var delimiter rune = ','

	// Detect delimiter and find the header line
	for i, line := range lines {
		trimmed := strings.TrimSpace(line)
		if strings.Contains(trimmed, "\t") {
			delimiter = '\t'
		} else if strings.Contains(trimmed, ";") {
			delimiter = ';'
		} else {
			delimiter = ','
		}

		lower := strings.ToLower(trimmed)
		if (strings.Contains(lower, "receipt no") || strings.Contains(lower, "receipt")) &&
			(strings.Contains(lower, "time") || strings.Contains(lower, "date") || strings.Contains(lower, "details")) {
			headerIndex = i
			break
		}
	}

	if headerIndex == -1 {
		return nil, fmt.Errorf("csv header not detected")
	}

	// Join remaining lines starting from header
	csvContent := strings.Join(lines[headerIndex:], "\n")
	reader := csv.NewReader(strings.NewReader(csvContent))
	reader.Comma = delimiter
	reader.FieldsPerRecord = -1
	reader.LazyQuotes = true

	headers, err := reader.Read()
	if err != nil {
		return nil, err
	}

	colMap := sp.mapHeaders(headers)
	var transactions []models.MpesaImportInput

	for {
		record, err := reader.Read()
		if err == io.EOF {
			break
		}
		if err != nil || len(record) == 0 {
			continue
		}

		tx, ok := sp.parseRecord(record, colMap)
		if ok {
			transactions = append(transactions, tx)
		}
	}

	return transactions, nil
}

func (sp *StatementParser) mapHeaders(headers []string) map[string]int {
	m := make(map[string]int)
	for i, h := range headers {
		cleaned := strings.ToLower(strings.TrimSpace(h))
		cleaned = strings.ReplaceAll(cleaned, ".", "")
		cleaned = strings.ReplaceAll(cleaned, "_", " ")

		switch {
		case strings.Contains(cleaned, "receipt"):
			m["receipt"] = i
		case strings.Contains(cleaned, "completion") || strings.Contains(cleaned, "trans") && strings.Contains(cleaned, "time") || cleaned == "time" || cleaned == "date":
			m["time"] = i
		case strings.Contains(cleaned, "detail") || strings.Contains(cleaned, "desc") || strings.Contains(cleaned, "particular"):
			m["details"] = i
		case strings.Contains(cleaned, "status"):
			m["status"] = i
		case strings.Contains(cleaned, "paid in") || strings.Contains(cleaned, "credit") || strings.Contains(cleaned, "received"):
			m["paid_in"] = i
		case strings.Contains(cleaned, "withdrawn") || strings.Contains(cleaned, "debit") || strings.Contains(cleaned, "sent"):
			m["withdrawn"] = i
		case strings.Contains(cleaned, "amount"):
			m["amount"] = i
		case strings.Contains(cleaned, "balance"):
			m["balance"] = i
		}
	}
	return m
}

func (sp *StatementParser) parseRecord(record []string, colMap map[string]int) (models.MpesaImportInput, bool) {
	getCol := func(key string) string {
		if idx, ok := colMap[key]; ok && idx < len(record) {
			return strings.TrimSpace(record[idx])
		}
		return ""
	}

	receipt := getCol("receipt")
	if receipt == "" || len(receipt) < 8 {
		// Attempt to see if column 0 looks like an M-Pesa receipt (e.g. QK87XYZ123)
		if len(record) > 0 && regexp.MustCompile(`^[A-Z0-9]{8,12}$`).MatchString(strings.TrimSpace(record[0])) {
			receipt = strings.TrimSpace(record[0])
		} else {
			return models.MpesaImportInput{}, false
		}
	}

	timeStr := getCol("time")
	details := getCol("details")
	status := getCol("status")

	// Skip failed/cancelled rows if explicit status is present
	if status != "" {
		sLower := strings.ToLower(status)
		if sLower != "completed" && sLower != "success" && sLower != "successful" {
			return models.MpesaImportInput{}, false
		}
	}

	paidInStr := getCol("paid_in")
	withdrawnStr := getCol("withdrawn")
	amountStr := getCol("amount")
	balanceStr := getCol("balance")

	paidIn := sp.parseAmount(paidInStr)
	withdrawn := sp.parseAmount(withdrawnStr)
	amount := sp.parseAmount(amountStr)
	balance := sp.parseAmount(balanceStr)

	var txType models.MpesaTransactionType
	var finalAmount float64
	isExpense := false

	if withdrawn > 0 {
		finalAmount = withdrawn
		isExpense = true
	} else if paidIn > 0 {
		finalAmount = paidIn
		isExpense = false
	} else if amount != 0 {
		if amount < 0 {
			finalAmount = -amount
			isExpense = true
		} else {
			finalAmount = amount
			isExpense = strings.Contains(strings.ToLower(details), "to") || strings.Contains(strings.ToLower(details), "payment")
		}
	}

	if finalAmount <= 0 {
		return models.MpesaImportInput{}, false
	}

	recipient, sender, phone := sp.extractParties(details)
	txType = sp.determineTransactionType(details, isExpense)

	formattedDate := sp.normalizeDate(timeStr)

	rawSummary := fmt.Sprintf("%s Confirmed. %s KES %.2f %s. Balance: KES %.2f.",
		receipt,
		string(txType),
		finalAmount,
		details,
		balance,
	)

	return models.MpesaImportInput{
		TransactionRef:  receipt,
		TransactionType: txType,
		Amount:          finalAmount,
		Balance:         balance,
		Sender:          sender,
		Recipient:       recipient,
		PhoneNumber:     phone,
		TransactionDate: formattedDate,
		RawMessage:      rawSummary,
		Currency:        "KES",
	}, true
}

func (sp *StatementParser) parseTextLines(text string) []models.MpesaImportInput {
	var results []models.MpesaImportInput
	lines := strings.Split(text, "\n")

	// Match receipt pattern e.g. QK87XYZ123 or RG12AB34CD
	refRegex := regexp.MustCompile(`\b([A-Z0-9]{10})\b`)
	dateRegex := regexp.MustCompile(`(\d{4}-\d{2}-\d{2}|\d{2}/\d{2}/\d{4})\s*(\d{2}:\d{2}(?::\d{2})?)?`)
	// Match monetary amounts strictly with two decimals with or without commas (e.g. -500.00, -1000.00 or 1,250.00)
	amountRegex := regexp.MustCompile(`(?:KES|Ksh)?\s*(-?(?:[0-9]{1,3}(?:,[0-9]{3})+|[0-9]+)\.[0-9]{2})\b`)

	for _, line := range lines {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		refMatch := refRegex.FindString(trimmed)
		if refMatch == "" {
			continue
		}

		dateMatch := dateRegex.FindString(trimmed)
		amountMatches := amountRegex.FindAllStringSubmatch(trimmed, -1)
		if len(amountMatches) == 0 {
			continue
		}

		var amounts []float64
		for _, m := range amountMatches {
			if len(m) > 1 {
				val := sp.parseAmount(m[1])
				if val != 0 {
					amounts = append(amounts, val)
				}
			}
		}

		if len(amounts) == 0 {
			continue
		}

		var finalAmount float64
		var balance float64
		if len(amounts) >= 2 {
			finalAmount = amounts[0]
			balance = amounts[len(amounts)-1]
		} else {
			finalAmount = amounts[0]
		}

		isExpense := finalAmount < 0 || strings.Contains(strings.ToLower(trimmed), "sent") ||
			strings.Contains(strings.ToLower(trimmed), "pay bill") ||
			strings.Contains(strings.ToLower(trimmed), "merchant") ||
			strings.Contains(strings.ToLower(trimmed), "airtime") ||
			strings.Contains(strings.ToLower(trimmed), "withdrawn")

		if finalAmount < 0 {
			finalAmount = -finalAmount
		}

		recipient, sender, phone := sp.extractParties(trimmed)
		txType := sp.determineTransactionType(trimmed, isExpense)

		results = append(results, models.MpesaImportInput{
			TransactionRef:  refMatch,
			TransactionType: txType,
			Amount:          finalAmount,
			Balance:         balance,
			Sender:          sender,
			Recipient:       recipient,
			PhoneNumber:     phone,
			TransactionDate: sp.normalizeDate(dateMatch),
			RawMessage:      trimmed,
			Currency:        "KES",
		})
	}

	return results
}

func (sp *StatementParser) parseAmount(str string) float64 {
	cleaned := strings.TrimSpace(str)
	cleaned = strings.ReplaceAll(cleaned, "KES", "")
	cleaned = strings.ReplaceAll(cleaned, "Ksh", "")
	cleaned = strings.ReplaceAll(cleaned, "ksh", "")
	cleaned = strings.ReplaceAll(cleaned, ",", "")
	cleaned = strings.TrimSpace(cleaned)

	val, err := strconv.ParseFloat(cleaned, 64)
	if err != nil {
		return 0
	}
	return val
}

func (sp *StatementParser) determineTransactionType(details string, isExpense bool) models.MpesaTransactionType {
	lower := strings.ToLower(details)
	switch {
	case strings.Contains(lower, "pay bill") || strings.Contains(lower, "paybill"):
		return models.MpesaTypePayBill
	case strings.Contains(lower, "merchant payment") || strings.Contains(lower, "buy goods") || strings.Contains(lower, "till"):
		return models.MpesaTypeBuyGoods
	case strings.Contains(lower, "airtime"):
		return models.MpesaTypeAirtime
	case strings.Contains(lower, "withdrawal") || strings.Contains(lower, "withdrawn") || strings.Contains(lower, "agent"):
		return models.MpesaTypeWithdrawal
	case strings.Contains(lower, "reversal"):
		return models.MpesaTypeReversal
	case strings.Contains(lower, "customer transfer") || strings.Contains(lower, "sent to") || (isExpense && strings.Contains(lower, "to")):
		return models.MpesaTypeSent
	case strings.Contains(lower, "funds received") || strings.Contains(lower, "received from"):
		return models.MpesaTypeReceived
	case strings.Contains(lower, "deposit") || !isExpense:
		return models.MpesaTypeDeposit
	default:
		if isExpense {
			return models.MpesaTypeSent
		}
		return models.MpesaTypeReceived
	}
}

func (sp *StatementParser) extractParties(details string) (recipient string, sender string, phone string) {
	phoneRegex := regexp.MustCompile(`\b(254\d{9}|07\d{8}|01\d{8})\b`)
	if match := phoneRegex.FindString(details); match != "" {
		phone = match
	}

	// Try extracting counterparty name after "to " or "from "
	lower := strings.ToLower(details)
	if idx := strings.Index(lower, " to "); idx != -1 {
		part := strings.TrimSpace(details[idx+4:])
		// Cut off at dash or account
		if dashIdx := strings.Index(part, " - "); dashIdx != -1 && dashIdx+3 < len(part) {
			recipient = strings.TrimSpace(part[dashIdx+3:])
		} else {
			recipient = part
		}
	} else if idx := strings.Index(lower, " from "); idx != -1 {
		part := strings.TrimSpace(details[idx+6:])
		if dashIdx := strings.Index(part, " - "); dashIdx != -1 && dashIdx+3 < len(part) {
			sender = strings.TrimSpace(part[dashIdx+3:])
		} else {
			sender = part
		}
	}

	if recipient == "" && strings.Contains(lower, "merchant payment to") {
		recipient = strings.TrimSpace(strings.TrimPrefix(details, "Merchant Payment to"))
	}
	if recipient == "" && strings.Contains(lower, "pay bill to") {
		recipient = strings.TrimSpace(strings.TrimPrefix(details, "Pay Bill to"))
	}

	return recipient, sender, phone
}

func (sp *StatementParser) normalizeDate(raw string) string {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return time.Now().Format("2006-01-02")
	}

	formats := []string{
		"2006-01-02 15:04:05",
		"2006-01-02 15:04",
		"2006-01-02",
		"02/01/2006 15:04:05",
		"02/01/2006 15:04",
		"02/01/2006",
		"02-01-2006 15:04:05",
		"02-01-2006",
	}

	for _, f := range formats {
		if t, err := time.Parse(f, raw); err == nil {
			return t.Format("2006-01-02")
		}
	}

	return raw
}
