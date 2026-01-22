# Session 01a: Foundation - Summary

## Overview

Established the Go server infrastructure and web build tooling for the go-lit POC. The server is fully functional with API endpoints for chat and vision streaming, scalar API documentation, and a minimal web shell.

## What Was Implemented

### Go Server
- **cmd/server/**: Entry point, server lifecycle, modules pattern, HTTP wrapper
- **internal/config/**: TOML configuration with environment variable overrides
- **internal/agents/**: ChatStream and VisionStream handlers with SSE responses
- **internal/api/**: API module assembly with OpenAPI spec generation
- **pkg/**: Shared infrastructure extracted from agent-lab (handlers, lifecycle, middleware, module, openapi, web)

### Web Infrastructure
- **web/scalar/**: OpenAPI documentation UI module
- **web/app/**: App module with embedded assets
- **Vite configuration**: Multi-client build system (app + scalar)
- **TypeScript configuration**: Path aliases and strict mode
- **Design system**: CSS layers (reset, theme, layout, components)

### Template Pattern
- **Layout + View pattern**: `app.html` layout with `{{ block "content" . }}{{ end }}`
- **View templates**: `home.html` placeholder defining content block
- **ViewDef/ViewData/TemplateSet**: Pre-parsed templates for zero per-request overhead

## Key Decisions

| Decision | Rationale |
|----------|-----------|
| **Modules pattern** | Separates module creation from server lifecycle; mirrors agent-lab structure |
| **Layout + View templates** | Enables server-rendered content blocks while maintaining single shell pattern |
| **`/{$}` route for Session 1** | Exact match for home only; Session 2 changes to `/{path...}` catch-all |
| **ViewHandler (not PageHandler)** | Consistent terminology: views are router targets |
| **No logger parameter in NewModule** | Middleware applied at module level after creation |
| **Config sent per-request** | No server-side config storage; client manages configs in localStorage |

## Patterns Established

### Server Patterns
- **Module structure**: `NewModule(basePath) → buildRouter(ts) → module.New(basePath, router)`
- **Modules aggregation**: `Modules` struct with `NewModules()` and `Mount(router)`
- **SSE streaming**: `writeSSEStream()` with flush after each chunk, `data: [DONE]` termination
- **Request types**: `ChatStreamRequest` (JSON), `VisionForm` (multipart)

### Template Patterns
- **Embed directives**: `//go:embed dist/*`, `server/layouts/*`, `server/views/*`, `public/*`
- **Public file routing**: Explicit file list for favicon infrastructure
- **TemplateSet**: Pre-parsed at startup, fail-fast on template errors

### Build Patterns
- **Multi-client Vite**: `vite.client.ts` merger for app + scalar builds
- **CSS layers**: `@layer reset, theme, layout, components` with `@import` cascade
- **Minimal entry point**: `app.ts` imports only CSS for Session 1

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/chat` | Stream chat response (SSE) |
| POST | `/api/vision` | Stream vision response with images (SSE) |
| GET | `/api/openapi.json` | OpenAPI 3.1 specification |
| GET | `/healthz` | Health check |
| GET | `/readyz` | Readiness check |
| GET | `/scalar/` | API documentation UI |
| GET | `/app/` | Web application shell |

## Files Created/Modified

### New Files
- `cmd/server/main.go`, `server.go`, `modules.go`, `http.go`
- `internal/config/`, `internal/agents/`, `internal/api/`
- `pkg/handlers/`, `pkg/lifecycle/`, `pkg/middleware/`, `pkg/module/`, `pkg/openapi/`, `pkg/web/`
- `web/package.json`, `tsconfig.json`, `vite.config.ts`, `vite.client.ts`
- `web/app/app.go`, `client.config.ts`, `client/app.ts`, `client/design/*`
- `web/app/server/layouts/app.html`, `server/views/home.html`
- `web/app/public/*` (favicon infrastructure)
- `web/scalar/scalar.go`, `client.config.ts`, `app.ts`, `index.html`
- `config.toml`, `go.mod`, `go.sum`

## Verification Results

- [x] `go vet ./...` passes
- [x] `go run ./cmd/server` starts without errors
- [x] `GET /healthz` returns OK
- [x] `GET /app/` renders shell with CSS applied
- [x] `GET /scalar/` renders API documentation
- [x] `POST /api/chat` streams SSE response (tested with curl)
- [x] `cd web && bun run build` generates dist assets

## Session 2 Preparation

The foundation is ready for client-side implementation:

1. **Router**: Change `/{$}` to `/{path...}` catch-all, implement client router
2. **Shared**: Create `api.ts` with SSE consumption, `types.ts` with Result<T>
3. **Config domain**: localStorage-based config management with service/context pattern
4. **Execution domain**: Chat/vision streaming with message state
5. **View components**: Convert `home.html` to `gl-home-view`, add config and execute views
