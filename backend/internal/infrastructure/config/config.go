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

	// LLM grading
	LLMURL   string // OpenAI-compatible endpoint, e.g. "http://localhost:1234"
	LLMModel string // model name, e.g. "qwen3-8b"
}

func Load() *Config {
	// Load .env file if it exists
	_ = godotenv.Load()
	return &Config{
		ServerAddress:   mustGetenv("SERVER_ADDRESS"),
		ShutdownTimeout: mustGetDuration("SHUTDOWN_TIMEOUT"),
		LLMURL:          getenvDefault("LLM_URL", "http://localhost:1234"),
		LLMModel:        getenvDefault("LLM_MODEL", "qwen3-8b"),
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

func getenvDefault(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
