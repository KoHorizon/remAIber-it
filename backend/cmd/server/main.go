// cmd/server/main.go
package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"github.com/remaimber-it/backend/internal/api"
	"github.com/remaimber-it/backend/internal/infrastructure/config"
	"github.com/remaimber-it/backend/internal/store"
)

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

	handler := api.NewHandler(db, logger)

	// ── Routes ──────────────────────────────────────────────────────
	mux := http.NewServeMux()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"status": "ok"}`))
	})

	api.RegisterRoutes(mux, handler)

	// ── Server ──────────────────────────────────────────────────────
	server := &http.Server{
		Addr:    cfg.ServerAddress,
		Handler: api.CORS(mux),
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
