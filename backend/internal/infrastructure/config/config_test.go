package config_test

import (
	"strings"
	"testing"
	"time"

	"github.com/remaimber-it/backend/internal/infrastructure/config"
)

// validEnv sets the required variables and clears the optional ones, so each
// test starts from a known state. t.Setenv restores everything afterwards.
func validEnv(t *testing.T) {
	t.Helper()
	t.Setenv("SERVER_ADDRESS", ":8080")
	t.Setenv("SHUTDOWN_TIMEOUT", "45s")
	t.Setenv("LLM_URL", "")
	t.Setenv("LLM_MODEL", "")
	t.Setenv("DATABASE_PATH", "")
}

// Load used to call log.Fatalf, which kills the process. That made the package
// untestable — hence no tests here before — and meant a library decided when
// the program died.
func TestLoad_MissingRequiredVariableReturnsError(t *testing.T) {
	for _, missing := range []string{"SERVER_ADDRESS", "SHUTDOWN_TIMEOUT"} {
		t.Run(missing, func(t *testing.T) {
			validEnv(t)
			t.Setenv(missing, "")

			_, err := config.Load()
			if err == nil {
				t.Fatalf("expected an error when %s is unset", missing)
			}
			if !strings.Contains(err.Error(), missing) {
				t.Errorf("error should name the missing variable, got %q", err)
			}
		})
	}
}

func TestLoad_InvalidDurationReturnsError(t *testing.T) {
	validEnv(t)
	t.Setenv("SHUTDOWN_TIMEOUT", "45 fortnights")

	_, err := config.Load()
	if err == nil {
		t.Fatal("expected an error for an unparseable duration")
	}
	if !strings.Contains(err.Error(), "SHUTDOWN_TIMEOUT") {
		t.Errorf("error should name the variable, got %q", err)
	}
}

func TestLoad_ValidEnvironment(t *testing.T) {
	validEnv(t)
	t.Setenv("SERVER_ADDRESS", ":9999")
	t.Setenv("SHUTDOWN_TIMEOUT", "10s")
	t.Setenv("LLM_URL", "http://example.test:1234")
	t.Setenv("LLM_MODEL", "some-model")
	t.Setenv("DATABASE_PATH", "/tmp/custom.db")

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.ServerAddress != ":9999" {
		t.Errorf("ServerAddress = %q, want %q", cfg.ServerAddress, ":9999")
	}
	if cfg.ShutdownTimeout != 10*time.Second {
		t.Errorf("ShutdownTimeout = %v, want 10s", cfg.ShutdownTimeout)
	}
	if cfg.LLMURL != "http://example.test:1234" {
		t.Errorf("LLMURL = %q", cfg.LLMURL)
	}
	if cfg.LLMModel != "some-model" {
		t.Errorf("LLMModel = %q", cfg.LLMModel)
	}
	if cfg.DatabasePath != "/tmp/custom.db" {
		t.Errorf("DatabasePath = %q, want %q", cfg.DatabasePath, "/tmp/custom.db")
	}
}

func TestLoad_OptionalDefaults(t *testing.T) {
	validEnv(t)

	cfg, err := config.Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.LLMURL != "http://localhost:1234" {
		t.Errorf("LLMURL default = %q", cfg.LLMURL)
	}
	if cfg.LLMModel != "qwen3-8b" {
		t.Errorf("LLMModel default = %q", cfg.LLMModel)
	}
	// The DB path was hardcoded in main.go — the one setting not in config.
	// Its default has to match what shipped, or an existing install would
	// silently start against a fresh, empty database.
	if cfg.DatabasePath != "remaimber.db" {
		t.Errorf("DatabasePath default = %q, want %q", cfg.DatabasePath, "remaimber.db")
	}
}
