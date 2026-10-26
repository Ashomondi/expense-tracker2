package services

import (
	"crypto/sha256"
	"encoding/hex"
	"regexp"
	"strconv"
	"strings"
	"time"

	"backend/models"
)

type MpesaParser struct{}

func NewMpesaParser() *MpesaParser {
	return &MpesaParser{}
}

func (p *MpesaParser) Parse(rawMessage string) *models.MpesaParserResult {
	result := &models.MpesaParserResult{
		RawMessage: rawMessage,
		Confidence: 0.0,
		Errors:     []string{},
	}

	trimmed := strings.TrimSpace(rawMessage)
	if trimmed == "" {
		result.Errors = append(result.Errors, "empty message")
		return result
	}

	if !p.isMpesaMessage(trimmed) {
		result.Errors = append(result.Errors, "not an M-Pesa message")
		result.Confidence = 0.0
		return result
	}

	result.Confidence = 0.5

	parsers := []func(string) *models.MpesaParserResult{
		p.parseReceived,
		p.parseReversal,
		p.parseSent,
		p.parsePayBill,
		p.parseBuyGoods,
		p.parseWithdrawal,
		p.parseAirtime,
		p.parseDeposit,
	}

	for _, parser := range parsers {
		parsed := parser(trimmed)
		if parsed != nil && parsed.Confidence > result.Confidence {
			result = parsed
			result.RawMessage = rawMessage
		}
	}

	if result.TransactionRef == "" {
		result.TransactionRef = p.generateFingerprint(rawMessage)
	}

	if result.Confidence < 0.7 {
		result.Errors = append(result.Errors, "low confidence parse")
	}

	return result
}

func (p *MpesaParser) isMpesaMessage(message string) bool {
	mpesaKeywords := []string{
		"M-PESA", "MPESA", "Mpesa", "Safaricom",
		"confirmed", "received", "sent to", "you sent", "sent",
		"paid to", "paybill", "till", "withdrawn", "deposited",
		"airtime", "reversal", "balance is",
	}
	lower := strings.ToLower(message)
	for _, kw := range mpesaKeywords {
		if strings.Contains(lower, strings.ToLower(kw)) {
			return true
		}
	}
	return false
}

func (p *MpesaParser) generateFingerprint(message string) string {
	hash := sha256.Sum256([]byte(message))
	return hex.EncodeToString(hash[:])
}

func (p *MpesaParser) extractAmount(text string) (float64, bool) {
	patterns := []string{
		`K[Ss]h?([0-9,]+\.?[0-9]*)`,
		`KES\s?([0-9,]+\.?[0-9]*)`,
		`([0-9,]+\.?[0-9]*)\s*KES`,
		`amount\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			val, err := strconv.ParseFloat(strings.ReplaceAll(matches[1], ",", ""), 64)
			if err == nil {
				return val, true
			}
		}
	}
	return 0, false
}

func (p *MpesaParser) extractFee(text string) (float64, bool) {
	patterns := []string{
		`fee\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
		`charge\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
		`transaction fee\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			val, err := strconv.ParseFloat(strings.ReplaceAll(matches[1], ",", ""), 64)
			if err == nil {
				return val, true
			}
		}
	}
	return 0, false
}

func (p *MpesaParser) extractBalance(text string) (float64, bool) {
	patterns := []string{
		`balance\s*(?:is|:)?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
		`new balance\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
		`account balance\s*[:\-]?\s*K[Ss]h?\s?([0-9,]+\.?[0-9]*)`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			val, err := strconv.ParseFloat(strings.ReplaceAll(matches[1], ",", ""), 64)
			if err == nil {
				return val, true
			}
		}
	}
	return 0, false
}

func (p *MpesaParser) extractPhone(text string) (string, bool) {
	patterns := []string{
		`(?i)(?:from|to|by)\s+(?:254|0)?(\d{9,10})`,
		`254(\d{9})`,
		`\b(\d{10})\b`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			return matches[1], true
		}
	}
	return "", false
}

func (p *MpesaParser) extractRef(text string) (string, bool) {
	patterns := []string{
		`(?:ref|reference|trans(?:action)?\.?\s*(?:id|ref|no)?)[\s:]*([A-Z0-9]{8,12})`,
		`([A-Z0-9]{10,12})`,
		`(?:[A-Z]{1,2}\d{8,10})`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			return strings.ToUpper(matches[1]), true
		}
	}
	return "", false
}

func (p *MpesaParser) extractName(text string, patterns []string) (string, bool) {
	for _, pattern := range patterns {
		re := regexp.MustCompile(`(?i)` + pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			name := strings.TrimSpace(matches[1])
			name = regexp.MustCompile(`\s+`).ReplaceAllString(name, " ")
			if len(name) > 1 && len(name) < 100 {
				return name, true
			}
		}
	}
	return "", false
}

func (p *MpesaParser) parseDate(text string) (time.Time, bool) {
	patterns := []string{
		`(\d{1,2}/\d{1,2}/\d{2,4}\s+\d{1,2}:\d{2})`,
		`(\d{1,2}/\d{1,2}/\d{2,4})`,
		`(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2})`,
		`(\d{4}-\d{2}-\d{2})`,
	}
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindStringSubmatch(text)
		if len(matches) > 1 {
			dateStr := matches[1]
			formats := []string{
				"02/01/06 15:04",
				"02/01/2006 15:04",
				"02/01/06",
				"02/01/2006",
				"2006-01-02 15:04:05",
				"2006-01-02",
			}
			for _, fmt := range formats {
				if t, err := time.Parse(fmt, dateStr); err == nil {
					return t, true
				}
			}
		}
	}
	return time.Now(), false
}

func (p *MpesaParser) parseReceived(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(received|you have received)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeReceived,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Sender, _ = p.extractName(text, []string{
		`from\s+([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
		`received\s+from\s+([A-Z\s.]+)`,
	})
	result.PhoneNumber, _ = p.extractPhone(text)
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseSent(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(sent to|you sent)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeSent,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Recipient, _ = p.extractName(text, []string{
		`sent to\s+([A-Z\s.]+?)(?:\s+\d{10,12})?\s+(?:on|at|ref|$)`,
		`you sent\s+([A-Z\s.]+?)(?:\s+\d{10,12})?\s+(?:on|at|ref|$)`,
		`to\s+([A-Z\s.]+?)(?:\s+\d{10,12})?\s+(?:on|at|ref|$)`,
	})
	result.PhoneNumber, _ = p.extractPhone(text)
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parsePayBill(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(paybill|pay bill)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypePayBill,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
result.Recipient, _ = p.extractName(text, []string{
		`paybill\s+([A-Z\s.]+?)(?:\s+\d+)?\s+(?:on|at|ref|$)`,
		`pay bill\s+([A-Z\s.]+?)(?:\s+\d+)?\s+(?:on|at|ref|$)`,
		`paid to\s+([A-Z\s.]+?)(?:\s+paybill\s+\d+)?\s+(?:on|at|ref|$)`,
	})
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseBuyGoods(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(buy goods|till|till number)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeBuyGoods,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Recipient, _ = p.extractName(text, []string{
		`till\s+(?:number\s+)?(\d+)`,
		`buy goods\s+(?:at\s+)?([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
		`till\s+([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
	})
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseWithdrawal(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(withdrawn|withdrawal|cash out)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeWithdrawal,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Recipient, _ = p.extractName(text, []string{
		`from\s+([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
		`agent\s+([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
	})
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseAirtime(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(airtime|bought airtime)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeAirtime,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Recipient = "Airtime"
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseReversal(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(reversal|reversed)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeReversal,
		Confidence:      0.8,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) parseDeposit(text string) *models.MpesaParserResult {
	if !regexp.MustCompile(`(?i)(deposited|deposit)`).MatchString(text) {
		return nil
	}
	result := &models.MpesaParserResult{
		TransactionType: models.MpesaTypeDeposit,
		Confidence:      0.7,
	}
	amt, ok := p.extractAmount(text)
	if ok {
		result.Amount = amt
		result.Confidence += 0.1
	}
	result.Sender, _ = p.extractName(text, []string{
		`deposited by\s+([A-Z\s.]+?)\s+(?:on|at|ref|$)`,
	})
	result.TransactionRef, _ = p.extractRef(text)
	result.Fee, _ = p.extractFee(text)
	result.Balance, _ = p.extractBalance(text)
	result.TransactionDate, _ = p.parseDate(text)
	return result
}

func (p *MpesaParser) ParseBatch(messages []string) []*models.MpesaParserResult {
	results := make([]*models.MpesaParserResult, len(messages))
	for i, msg := range messages {
		results[i] = p.Parse(msg)
	}
	return results
}