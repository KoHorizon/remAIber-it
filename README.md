# remAIber

> Desktop application with Go backend and Tauri frontend

## Description

This project is a cross-platform desktop application using a client-server architecture with:
- **Backend** : REST API in Go logic and data access
- **Frontend** : User interface with Tauri (Rust + React)

## Prérequis

### Prerequisites
- Go 1.24+
- LM Studio (for local AI model)

### Frontend
- Bun
- Rust
- Tauri system dependencies ([see the documentation](https://tauri.app/start/prerequisites/))

## Installation

### Backend Configuration
```bash
cd backend

# Copy the configuration file
cp .env.example .env
```

### Frontend Setup
```bash
cd frontend
bun install
```

## Development

### Launch the backend and the frontend
```bash
cd backend
make dev
```

The web server starts by default on `http://localhost:1420`

### Launch the backend and Tauri
```bash
cd backend
make tauri
```

The desktop application automatically launches in development mode.

## Production

### Backend Build
```bash
cd backend
make build
```

### Frontend Build
```bash
cd frontend
bun run tauri -- build --bundles appimage
```

The AppImage will be generated in `frontend/src-tauri/target/release/bundle/appimage/`

## API Documentation

The REST API is documented and accessible at `http://localhost:8080/api/docs` when the server is running

## Technologies

### Backend
- **Go**
- **SQLite**

### Frontend
- **Tauri**
- **React**
- **TypeScript**
- **Monaco Editor**
- **Vite**
