package config

import (
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerAddress   string
	ShutdownTimeout time.Duration
	// add DB, API keys later
}

func Load() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()
	return &Config{
		ServerAddress:   mustGetenv("SERVER_ADDRESS"),
		ShutdownTimeout: mustGetDuration("SHUTDOWN_TIMEOUT"),
	}
}

func mustGetenv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("config: required environment variable %s is not set", k)
	}
	return v
}

func mustGetDuration(k string) time.Duration {
	v := os.Getenv(k)
	if v == "" {
		log.Fatalf("config: required environment variable %s is not set", k)
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		log.Fatalf("config: %s=%q is not a valid duration: %v", k, v, err)
	}
	return d
}
