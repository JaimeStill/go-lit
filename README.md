# go-lit

A proof-of-concept project validating the Go + Lit web application architecture.

## Purpose

This project establishes a foundational architecture for building web applications where:

- **Go** owns data, routing, and serves a static shell with embedded assets
- **Lit** owns presentation, state management, and client-side routing

The architecture enforces a hard boundary between server and client concerns, enabling clean separation while leveraging Go's embedded filesystem for single-binary deployment.

## Architecture Overview

### Server (Go)

- Single HTML shell template serves all `/app/*` routes (Go has no view awareness)
- JSON API endpoints at `/api/*`
- OpenAPI documentation at `/scalar`
- Assets embedded via `//go:embed` for zero-dependency deployment

### Client (Lit + TypeScript)

The client architecture follows a structured component hierarchy with clear responsibility boundaries:

**Router**: Static route-to-component mapping. The router reads `location.pathname`, matches against a routes map, extracts params from `:param` segments, and mounts components to the content container. It intercepts link clicks for `pushState` navigation and listens on `popstate` for browser back/forward.

**Component Hierarchy**:

| Type | Service Awareness | Responsibility |
|------|-------------------|----------------|
| **View** | Initializes and provides via `@provide()` | Router targets, own service lifecycle |
| **Stateful** | Consumes via `@consume()` | Handle events, coordinate state |
| **Stateless** | None | Pure: attributes in, events out |

**Services**: Interface-based contracts consumed via `@lit/context`. View components provide concrete implementations; stateful components consume the interface type with no visibility into backing implementation.

**Signals**: `@lit-labs/signals` for reactive state. Service-level signals are shared across consumers; component-level signals are scoped to instance trees.

**Event Flow**: Stateless components emit events → Stateful components catch and handle by invoking service methods → Events do not propagate beyond the stateful boundary.

**Directory Structure**: Organized by domain. Each domain contains `views/`, `components/`, `elements/`, along with `interfaces.ts`, `types.ts`, and `context.ts`.

## Quick Start

```bash
# Build client assets
cd web && bun install && bun run build

# Run server
cd .. && go run ./cmd/server

# Access
# App: http://localhost:8080/app/
# API Docs: http://localhost:8080/scalar
```

## Project Status

This is a proof-of-concept.

**Session 1 (Complete)**: Go server infrastructure, API endpoints (chat/vision streaming), Scalar documentation, web build tooling, and minimal shell template.

**Session 2 (Pending)**: Client-side router, shared infrastructure, config domain (localStorage), execution domain (SSE streaming), and Lit view components.

See [PROJECT.md](PROJECT.md) for detailed implementation roadmap.

## Related Projects

- [agent-lab](https://github.com/JaimeStill/agent-lab) - The target project this architecture will inform
- [go-agents](https://github.com/JaimeStill/go-agents) - LLM integration library used for agent execution
