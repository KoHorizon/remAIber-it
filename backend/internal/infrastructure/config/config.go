package config

import (
	"fmt"
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	ServerAddress   string
	ShutdownTimeout time.Duration

	// DatabasePath is the SQLite file. Relative paths resolve against the
	// working directory, as they did when this was hardcoded in main.
	DatabasePath string

	// LLM grading
	LLMURL   string // OpenAI-compatible endpoint, e.g. "http://localhost:1234"
	LLMModel string // model name, e.g. "qwen3-8b"
}

// Load reads configuration from the environment, falling back to a .env file.
//
// It returns an error rather than exiting: deciding when the process dies
// belongs to main, not to a package it imports. The previous log.Fatalf calls
// also made this package impossible to test, which is why it had no tests.
func Load() (*Config, error) {
	// Load .env file if it exists
	_ = godotenv.Load()

	serverAddress, err := requireEnv("SERVER_ADDRESS")
	if err != nil {
		return nil, err
	}

	shutdownTimeout, err := requireDuration("SHUTDOWN_TIMEOUT")
	if err != nil {
		return nil, err
	}

	return &Config{
		ServerAddress:   serverAddress,
		ShutdownTimeout: shutdownTimeout,
		DatabasePath:    getenvDefault("DATABASE_PATH", "remaimber.db"),
		LLMURL:          getenvDefault("LLM_URL", "http://localhost:1234"),
		LLMModel:        getenvDefault("LLM_MODEL", "qwen3-8b"),
	}, nil
}

func requireEnv(k string) (string, error) {
	v := os.Getenv(k)
	if v == "" {
		return "", fmt.Errorf("config: required environment variable %s is not set", k)
	}
	return v, nil
}

func requireDuration(k string) (time.Duration, error) {
	v, err := requireEnv(k)
	if err != nil {
		return 0, err
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("config: %s=%q is not a valid duration: %w", k, v, err)
	}
	return d, nil
}

func getenvDefault(k, fallback string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return fallback
}
