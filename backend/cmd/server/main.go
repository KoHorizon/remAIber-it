package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	httpSwagger "github.com/swaggo/http-swagger"

	"github.com/remaimber-it/backend/internal/api"
	"github.com/remaimber-it/backend/internal/grader"
	"github.com/remaimber-it/backend/internal/infrastructure/config"
	"github.com/remaimber-it/backend/internal/service"
	"github.com/remaimber-it/backend/internal/store"

	_ "github.com/remaimber-it/backend/docs" // generated swagger docs
)

// @title           Remaimber-it API
// @version         1.0
// @description     Personal learning companion — create question banks, practice, and let AI grade your answers.

// @host      localhost:8080
// @BasePath  /

func main() {
	cfg := config.Load()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	// ── Dependencies ────────────────────────────────────────────────
	db, err := store.NewSQLite("remaimber.db")
	if err != nil {
		logger.Error("failed to open database", "error", err)
		os.Exit(1)
	}
	defer db.Close()

	llm := grader.NewOllamaGrader(cfg.LLMURL, cfg.LLMModel)
	gradingSvc := service.NewGradingService(db, llm, logger)
	handler := api.NewHandler(db, gradingSvc, logger)

	// ── Routes ──────────────────────────────────────────────────────
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	api.RegisterRoutes(mux, handler)

	// Swagger UI served at /swagger/
	mux.Handle("GET /swagger/", httpSwagger.WrapHandler)

	// ── Middleware chain: Logging → CORS → mux ──────────────────────
	logged := api.Logging(logger)(api.CORS(mux))

	// ── Server ──────────────────────────────────────────────────────
	server := &http.Server{
		Addr:              cfg.ServerAddress,
		Handler:           logged,
		ReadTimeout:       15 * time.Second,
		ReadHeaderTimeout: 5 * time.Second,
		WriteTimeout:      30 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan

		ctx, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
		defer cancel()

		logger.Info("shutting down server")
		if err := server.Shutdown(ctx); err != nil {
			logger.Error("server forced to shutdown", "error", err)
		}
	}()

	logger.Info("starting server", "address", cfg.ServerAddress)
	if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server failed to start", "error", err)
		os.Exit(1)
	}
}
