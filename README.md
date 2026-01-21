# go-lit

A proof-of-concept project validating the Go + Lit web application architecture.

## Purpose

This project establishes a foundational architecture for building web applications where:

- **Go** owns data, routing, and serves a static shell with embedded assets
- **Lit** owns presentation, state management, and client-side routing

The architecture enforces a hard boundary between server and client concerns, enabling clean separation while leveraging Go's embedded filesystem for single-binary deployment.

## Architecture Overview

### Server (Go)

- Single HTML shell template serves all `/app/*` routes
- JSON API endpoints at `/api/*`
- OpenAPI documentation at `/scalar`
- Assets embedded via `//go:embed` for zero-dependency deployment

### Client (Lit + TypeScript)

- **Custom router**: Static route-to-component mapping with param extraction
- **Three-tier components**:
  - **Views**: Router targets, initialize and provide services via `@lit/context`
  - **Stateful**: Consume services, handle events, coordinate state
  - **Stateless**: Pure components, attributes in, events out
- **Signals**: `@lit-labs/signals` for reactive state management
- **Services**: Interface-based contracts, factory functions return implementations

## Quick Start

```bash
# Build client assets
cd web && bun install && bun run build

# Run server
go run ./cmd/server

# Access
# App: http://localhost:8080/app/
# API Docs: http://localhost:8080/scalar
```

## Project Status

This is a proof-of-concept. See [PROJECT.md](PROJECT.md) for implementation roadmap and session planning.

## Related Projects

- [agent-lab](https://github.com/JaimeStill/agent-lab) - The target project this architecture will inform
- [go-agents](https://github.com/JaimeStill/go-agents) - LLM integration library used for agent execution
