package services

import (
	"errors"
	"time"

	"backend/models"
	"backend/repository"
)

var (
	ErrMpesaImportNotFound = errors.New("mpesa import not found")
	ErrInvalidMpesaImport  = errors.New("invalid mpesa import data")
	ErrDuplicateImport     = errors.New("duplicate import")
)

type MpesaService interface {
	ImportTransactions(userID uint, inputs []models.MpesaImportInput) (*models.MpesaImportResult, error)
	PreviewTransaction(input models.MpesaImportInput) (*models.MpesaParserResult, error)
	GetImportHistory(userID uint, limit int) ([]models.MpesaImport, error)
	GetImportStats(userID uint) (map[string]int, error)
	GetImportByID(userID uint, id uint) (*models.MpesaImport, error)
	DeleteImport(userID uint, id uint) error
	CreateExpenseFromImport(userID uint, importID uint) (*models.Expense, error)
}

type mpesaService struct {
	mpesaRepo    repository.MpesaRepository
	expenseRepo  repository.ExpenseRepository
	parser       *MpesaParser
}

func NewMpesaService(mpesaRepo repository.MpesaRepository, expenseRepo repository.ExpenseRepository) MpesaService {
	return &mpesaService{
		mpesaRepo:   mpesaRepo,
		expenseRepo: expenseRepo,
		parser:      NewMpesaParser(),
	}
}

func (s *mpesaService) ImportTransactions(userID uint, inputs []models.MpesaImportInput) (*models.MpesaImportResult, error) {
	result := &models.MpesaImportResult{
		Details: make([]models.MpesaImportDetail, 0, len(inputs)),
	}

	for _, input := range inputs {
		detail := s.processSingleImport(userID, input)
		result.Details = append(result.Details, detail)

		switch detail.Status {
		case models.MpesaImportStatusImported:
			result.Imported++
		case models.MpesaImportStatusSkipped:
			result.Skipped++
		case models.MpesaImportStatusDuplicate:
			result.Duplicates++
		case models.MpesaImportStatusFailed:
			result.Failed++
		}
	}

	return result, nil
}

func (s *mpesaService) processSingleImport(userID uint, input models.MpesaImportInput) models.MpesaImportDetail {
	// If raw message is provided but parsed fields are empty, parse it
	if input.RawMessage != "" && (input.Amount == 0 || input.TransactionType == "") {
		parsed := s.parser.Parse(input.RawMessage)
		if parsed != nil && parsed.Confidence > 0.5 {
			if input.Amount == 0 {
				input.Amount = parsed.Amount
			}
			if input.TransactionType == "" {
				input.TransactionType = parsed.TransactionType
			}
			if input.TransactionRef == "" {
				input.TransactionRef = parsed.TransactionRef
			}
			if input.Fee == 0 {
				input.Fee = parsed.Fee
			}
			if input.Balance == 0 {
				input.Balance = parsed.Balance
			}
			if input.Sender == "" {
				input.Sender = parsed.Sender
			}
			if input.Recipient == "" {
				input.Recipient = parsed.Recipient
			}
			if input.PhoneNumber == "" {
				input.PhoneNumber = parsed.PhoneNumber
			}
			if input.TransactionDate == "" && !parsed.TransactionDate.IsZero() {
				input.TransactionDate = parsed.TransactionDate.Format("2006-01-02")
			}
if input.Currency == "" {
			input.Currency = "KES"
		}
		}
	}

	detail := models.MpesaImportDetail{
		TransactionRef:  input.TransactionRef,
		TransactionType: input.TransactionType,
		Amount:          input.Amount,
	}

	parsedDate, err := time.Parse("2006-01-02", input.TransactionDate)
	if err != nil {
		parsedDate = time.Now()
	}

	fingerprint := input.TransactionRef
	if fingerprint == "" && input.RawMessage != "" {
		fingerprint = s.parser.generateFingerprint(input.RawMessage)
	}

	if fingerprint != "" {
		existing, err := s.mpesaRepo.FindByUserIDAndFingerprint(userID, fingerprint)
		if err == nil && existing != nil {
			detail.Status = models.MpesaImportStatusDuplicate
			detail.ErrorMessage = "Duplicate transaction (same fingerprint)"
			return detail
		}
	}

	if input.TransactionRef != "" {
		existing, err := s.mpesaRepo.FindByUserIDAndRef(userID, input.TransactionRef)
		if err == nil && existing != nil {
			detail.Status = models.MpesaImportStatusDuplicate
			detail.ErrorMessage = "Duplicate transaction reference"
			return detail
		}
	}

	if input.Amount <= 0 {
		detail.Status = models.MpesaImportStatusFailed
		detail.ErrorMessage = "Invalid amount"
		return detail
	}

	if input.TransactionType == models.MpesaTypeUnknown {
		detail.Status = models.MpesaImportStatusFailed
		detail.ErrorMessage = "Unknown transaction type"
		return detail
	}

	incomingTypes := map[models.MpesaTransactionType]bool{
		models.MpesaTypeReceived: true,
		models.MpesaTypeDeposit:  true,
	}

	if incomingTypes[input.TransactionType] {
		detail.Status = models.MpesaImportStatusSkipped
		detail.ErrorMessage = "Incoming transaction, not recorded as expense"
		return detail
	}

	if input.TransactionType == models.MpesaTypeReversal {
		detail.Status = models.MpesaImportStatusSkipped
		detail.ErrorMessage = "Reversal transaction, not recorded as expense"
		return detail
	}

	currency := input.Currency
	if currency == "" {
		currency = "KES"
	}

	importRecord := &models.MpesaImport{
		UserID:          userID,
		TransactionRef:  input.TransactionRef,
		Fingerprint:     fingerprint,
		TransactionType: input.TransactionType,
		Amount:          input.Amount,
		Fee:             input.Fee,
		Balance:         input.Balance,
		Sender:          input.Sender,
		Recipient:       input.Recipient,
		PhoneNumber:     input.PhoneNumber,
		TransactionDate: parsedDate,
		RawMessage:      input.RawMessage,
		Status:          models.MpesaImportStatusImported,
		Currency:        currency,
	}

	if err := s.mpesaRepo.Create(importRecord); err != nil {
		detail.Status = models.MpesaImportStatusFailed
		detail.ErrorMessage = "Failed to save import record: " + err.Error()
		return detail
	}

	detail.Status = models.MpesaImportStatusImported
	return detail
}

func (s *mpesaService) PreviewTransaction(input models.MpesaImportInput) (*models.MpesaParserResult, error) {
	if input.RawMessage != "" {
		return s.parser.Parse(input.RawMessage), nil
	}
	return &models.MpesaParserResult{
		TransactionRef:  input.TransactionRef,
		TransactionType: input.TransactionType,
		Amount:          input.Amount,
		Fee:             input.Fee,
		Balance:         input.Balance,
		Sender:          input.Sender,
		Recipient:       input.Recipient,
		PhoneNumber:     input.PhoneNumber,
		Confidence:      1.0,
	}, nil
}

func (s *mpesaService) GetImportHistory(userID uint, limit int) ([]models.MpesaImport, error) {
	return s.mpesaRepo.GetRecentImports(userID, limit)
}

func (s *mpesaService) GetImportStats(userID uint) (map[string]int, error) {
	return s.mpesaRepo.GetImportStats(userID)
}

func (s *mpesaService) GetImportByID(userID uint, id uint) (*models.MpesaImport, error) {
	record, err := s.mpesaRepo.FindByID(id)
	if err != nil {
		return nil, err
	}
	if record.UserID != userID {
		return nil, ErrMpesaImportNotFound
	}
	return record, nil
}

func (s *mpesaService) DeleteImport(userID uint, id uint) error {
	return s.mpesaRepo.Delete(id, userID)
}

func (s *mpesaService) CreateExpenseFromImport(userID uint, importID uint) (*models.Expense, error) {
	importRecord, err := s.GetImportByID(userID, importID)
	if err != nil {
		return nil, err
	}

	if importRecord.Status != models.MpesaImportStatusImported {
		return nil, errors.New("can only create expense from imported transactions")
	}

	if importRecord.ExpenseID != nil {
		return nil, errors.New("expense already created from this import")
	}

	incomingTypes := map[models.MpesaTransactionType]bool{
		models.MpesaTypeReceived: true,
		models.MpesaTypeDeposit:  true,
		models.MpesaTypeReversal: true,
	}
	if incomingTypes[importRecord.TransactionType] {
		return nil, errors.New("cannot create expense from incoming/reversal transaction")
	}

	category := importRecord.MapToCategory()
	expenseInput := importRecord.ToExpenseInput(category)

	expense := &models.Expense{
		UserID:   userID,
		Title:    expenseInput.Title,
		Amount:   expenseInput.Amount,
		Category: expenseInput.Category,
		Currency: expenseInput.Currency,
		Date:     importRecord.TransactionDate,
	}

	if err := s.expenseRepo.Create(expense); err != nil {
		return nil, err
	}

	importRecord.ExpenseID = &expense.ID
	importRecord.Status = models.MpesaImportStatusImported
	if err := s.mpesaRepo.Update(importRecord); err != nil {
		return nil, err
	}

	return expense, nil
}