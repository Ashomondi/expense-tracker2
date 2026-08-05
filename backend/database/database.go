package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

// Config holds all runtime configuration for the application, loaded
// once at startup from environment variables (and .env in local dev).
type Config struct {
	Port          string
	DBUrl         string
	JWTSecret     string
	JWTExpiration time.Duration
}

// Load reads .env (if present) and environment variables into a Config.
// It fails fast if a required variable is missing, so misconfiguration
// is caught at boot rather than on the first request that needs it.
func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("no .env file found, relying on environment variables")
	}

	cfg := &Config{
		Port:          getEnv("PORT", "8080"),
		DBUrl:         mustGetEnv("DB_URL"),
		JWTSecret:     mustGetEnv("JWT_SECRET"),
		JWTExpiration: 24 * time.Hour,
	}

	return cfg
}

func getEnv(key, fallback string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return fallback
}

func mustGetEnv(key string) string {
	val := os.Getenv(key)
	if val == "" {
		log.Fatalf("required environment variable %s is not set", key)
	}
	return val
}