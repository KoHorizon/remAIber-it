package api

import (
	"log/slog"
	"net/http"
	"time"
)

// CORS allows any origin. This is a deliberate choice for a single-user app
// whose backend is started by, and lives alongside, its own desktop client —
// not an oversight, and not something to tighten without the note below.
//
// Why the wildcard: the client is either Vite on http://localhost:5173 or a
// Tauri webview, whose origin varies by platform (tauri://localhost on macOS,
// http://tauri.localhost on Windows). An allow-list would have to enumerate
// all of those and would silently break the desktop build when Tauri changed
// its scheme, with a failure mode — every request blocked by the browser —
// that looks like a backend outage.
//
// What it costs: there is no authentication, so any page the user visits can
// script requests against this server for as long as it is running, and read
// the responses. Nothing here is a secret and the blast radius is one local
// question bank, so the trade is acceptable while both of these hold:
//
//   - the server binds loopback or a trusted LAN only (SERVER_ADDRESS), and
//   - there is exactly one user and no credentials to steal.
//
// Break either — expose this to a network, or add accounts, multi-user data,
// or an API key — and the wildcard has to go. Replace it with an origin
// allow-list plus Access-Control-Allow-Credentials, and add auth; do not just
// narrow the header, since without auth a narrowed origin buys very little.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func newResponseWriter(w http.ResponseWriter) *responseWriter {
	return &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}

// Logging returns middleware that logs every request with method, path,
// status code, and duration.
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := newResponseWriter(w)

			next.ServeHTTP(rw, r)

			logger.Info("request",
				"method", r.Method,
				"path", r.URL.Path,
				"status", rw.statusCode,
				"duration", time.Since(start),
			)
		})
	}
}
