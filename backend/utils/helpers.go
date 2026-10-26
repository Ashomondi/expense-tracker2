package utils

import (
	"strconv"
	"strings"
	"time"
)

func ParseDate(dateStr string) (time.Time, error) {
	if dateStr == "" {
		return time.Now(), nil
	}
	return time.Parse("2006-01-02", dateStr)
}

func ParseFloat(s string) (float64, error) {
	return strconv.ParseFloat(strings.TrimSpace(s), 64)
}

func ParseUint(s string) (uint, error) {
	val, err := strconv.ParseUint(strings.TrimSpace(s), 10, 64)
	return uint(val), err
}

func DefaultString(value, fallback string) string {
	if strings.TrimSpace(value) == "" {
		return fallback
	}
	return value
}

func DefaultFloat(value float64, fallback float64) float64 {
	if value <= 0 {
		return fallback
	}
	return value
}

func DefaultUint(value uint, fallback uint) uint {
	if value == 0 {
		return fallback
	}
	return value
}

func TruncateString(s string, maxLen int) string {
	if len(s) <= maxLen {
		return s
	}
	return s[:maxLen-3] + "..."
}

func GetMonthName(month int) string {
	months := []string{
		"January", "February", "March", "April", "May", "June",
		"July", "August", "September", "October", "November", "December",
	}
	if month >= 1 && month <= 12 {
		return months[month-1]
	}
	return ""
}