# Commands

## Build

```bash
# Build web assets (required before running server)
cd web && bun install && bun run build

# Build server binary
go build -o bin/server ./cmd/server
```

## Run

```bash
# Development (build + run)
make dev

# Or manually:
cd web && bun run build
go run ./cmd/server
```

## Validation

```bash
go vet ./...           # Check for errors
go test ./tests/...    # Run tests
```

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make dev` | Build web assets and run server |
| `make build` | Production build (web + binary) |
| `make web` | Build web assets only |
| `make run` | Run server (assumes assets built) |
| `make test` | Run tests |
| `make vet` | Run go vet |
| `make clean` | Remove build artifacts |

## Access Points

| URL | Description |
|-----|-------------|
| `http://localhost:8080/app/` | Lit web application |
| `http://localhost:8080/api/` | JSON API endpoints |
| `http://localhost:8080/api/openapi.json` | OpenAPI spec |
| `http://localhost:8080/scalar` | API documentation UI |
