.PHONY: help run build test test-race clean dev

help:
	@echo "Available commands:"
	@echo "  make run         - Run the backend"
	@echo "  make build       - Build the backend"
	@echo "  make test        - Run tests"
	@echo "  make test-race   - Run tests with race detector"
	@echo "  make clean       - Remove build artifacts"
	@echo "  make dev         - Run backend and frontend together"

run:
	go run cmd/server/main.go

build:
	go build -o bin/server cmd/server/main.go

test:
	go test ./...

test-race:
	go test -race ./...

clean:
	rm -rf bin/

dev:
	@echo "Starting backend and frontend..."
	@go run cmd/server/main.go & \
	cd ../frontend && bun run dev && \
	wait

tauri:
	@echo "Starting backend and Tauri app..."
	@go run cmd/server/main.go & \
	cd ../frontend && bun run tauri dev && \
	wait