# Swagger Setup Instructions

## 1. Install dependencies

```bash
# Install the swag CLI (generates docs from annotations)
go install github.com/swaggo/swag/cmd/swag@latest

# Add Go modules
go get github.com/swaggo/http-swagger@latest
go get github.com/swaggo/swag@latest
```

## 2. Generate docs

Run this from the `backend/` directory every time you change annotations:

```bash
swag init -g cmd/server/main.go -o docs
```

This creates a `docs/` folder with:

- `docs.go` — Go package imported by `main.go`
- `swagger.json` — OpenAPI spec
- `swagger.yaml` — same in YAML

## 3. Run the server

```bash
make run
```

## 4. Access Swagger UI

Open [http://localhost:8080/swagger/](http://localhost:8080/swagger/) in your browser.

## 5. Regenerate after changes

Whenever you add/modify `@Summary`, `@Param`, `@Success`, etc. annotations:

```bash
swag init -g cmd/server/main.go -o docs
```

## Notes

- The `_ "github.com/remaimber-it/backend/docs"` import in `main.go` loads the generated spec at startup.
- Add `docs/` to `.gitignore` if you prefer to regenerate on CI, or commit it for convenience.
- The `@host` annotation in `main.go` defaults to `localhost:8080` — update for production.
