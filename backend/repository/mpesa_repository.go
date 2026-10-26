package repository

import (
	"errors"

	"backend/models"

	"gorm.io/gorm"
)

var ErrMpesaImportNotFound = errors.New("mpesa import not found")

type MpesaRepository interface {
	FindByID(id uint) (*models.MpesaImport, error)
	FindByUserID(userID uint) ([]models.MpesaImport, error)
	FindByUserIDAndFingerprint(userID uint, fingerprint string) (*models.MpesaImport, error)
	FindByUserIDAndRef(userID uint, ref string) (*models.MpesaImport, error)
	Create(importRecord *models.MpesaImport) error
	Update(importRecord *models.MpesaImport) error
	Delete(id uint, userID uint) error
	GetImportStats(userID uint) (map[string]int, error)
	GetRecentImports(userID uint, limit int) ([]models.MpesaImport, error)
}

type mpesaRepository struct {
	db *gorm.DB
}

func NewMpesaRepository(db *gorm.DB) MpesaRepository {
	return &mpesaRepository{db: db}
}

func (r *mpesaRepository) FindByID(id uint) (*models.MpesaImport, error) {
	var record models.MpesaImport
	if err := r.db.Where("id = ?", id).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMpesaImportNotFound
		}
		return nil, err
	}
	return &record, nil
}

func (r *mpesaRepository) FindByUserID(userID uint) ([]models.MpesaImport, error) {
	var records []models.MpesaImport
	if err := r.db.Where("user_id = ?", userID).Order("created_at desc").Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}

func (r *mpesaRepository) FindByUserIDAndFingerprint(userID uint, fingerprint string) (*models.MpesaImport, error) {
	var record models.MpesaImport
	if err := r.db.Where("user_id = ? AND fingerprint = ?", userID, fingerprint).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMpesaImportNotFound
		}
		return nil, err
	}
	return &record, nil
}

func (r *mpesaRepository) FindByUserIDAndRef(userID uint, ref string) (*models.MpesaImport, error) {
	var record models.MpesaImport
	if err := r.db.Where("user_id = ? AND transaction_ref = ?", userID, ref).First(&record).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, ErrMpesaImportNotFound
		}
		return nil, err
	}
	return &record, nil
}

func (r *mpesaRepository) Create(importRecord *models.MpesaImport) error {
	return r.db.Create(importRecord).Error
}

func (r *mpesaRepository) Update(importRecord *models.MpesaImport) error {
	return r.db.Save(importRecord).Error
}

func (r *mpesaRepository) Delete(id uint, userID uint) error {
	result := r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&models.MpesaImport{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return ErrMpesaImportNotFound
	}
	return nil
}

func (r *mpesaRepository) GetImportStats(userID uint) (map[string]int, error) {
	var stats struct {
		Imported  int64
		Skipped   int64
		Duplicates int64
		Failed    int64
	}

	if err := r.db.Model(&models.MpesaImport{}).
		Where("user_id = ? AND status = ?", userID, models.MpesaImportStatusImported).
		Count(&stats.Imported).Error; err != nil {
		return nil, err
	}

	if err := r.db.Model(&models.MpesaImport{}).
		Where("user_id = ? AND status = ?", userID, models.MpesaImportStatusSkipped).
		Count(&stats.Skipped).Error; err != nil {
		return nil, err
	}

	if err := r.db.Model(&models.MpesaImport{}).
		Where("user_id = ? AND status = ?", userID, models.MpesaImportStatusDuplicate).
		Count(&stats.Duplicates).Error; err != nil {
		return nil, err
	}

	if err := r.db.Model(&models.MpesaImport{}).
		Where("user_id = ? AND status = ?", userID, models.MpesaImportStatusFailed).
		Count(&stats.Failed).Error; err != nil {
		return nil, err
	}

	return map[string]int{
		"imported":   int(stats.Imported),
		"skipped":    int(stats.Skipped),
		"duplicates": int(stats.Duplicates),
		"failed":     int(stats.Failed),
	}, nil
}

func (r *mpesaRepository) GetRecentImports(userID uint, limit int) ([]models.MpesaImport, error) {
	var records []models.MpesaImport
	if limit <= 0 {
		limit = 50
	}
	if err := r.db.Where("user_id = ?", userID).
		Order("created_at desc").
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, err
	}
	return records, nil
}