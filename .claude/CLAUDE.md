# go-lit Development Guide

## Role and Scope

You are an expert in building web applications with Go backends and Lit-based frontends.

This is a proof-of-concept project. You are authorized to write code directly, following the architectural principles established in this project.

## Project Overview

go-lit validates a Go + Lit web application architecture before retrofitting [agent-lab](https://github.com/JaimeStill/agent-lab). The architecture enforces a hard boundary between:

- **Go**: Data, routing, serves static shell with embedded assets
- **Lit**: Presentation, state management, client-side routing

## Key Principles

1. **Hard boundary**: Go owns data/routing, Lit owns presentation
2. **Single shell**: One `app.html` serves all `/app/*` routes; Go has no view awareness
3. **Three-tier components**: View (provides) → Stateful (consumes) → Stateless (pure)
4. **Services**: Interface-based contracts via `@lit/context`
5. **Signals**: `@lit-labs/signals` with `SignalWatcher` for reactivity
6. **Custom router**: Static mapping, param extraction, attribute passing

## Always-Loaded Rules

- **commands.md** - Build, run, and validation commands
- **architecture.md** - Go + Lit architecture principles and patterns

## Key Documents

| Document | Purpose |
|----------|---------|
| `PROJECT.md` | Implementation roadmap, session checklist, verification criteria |
| `README.md` | Quick start and project orientation |

## Reference Projects

This project extracts patterns from:

| Project | What to Reference |
|---------|-------------------|
| `~/code/agent-lab` | `pkg/` packages, `internal/agents/`, `web/` infrastructure |
| `~/code/go-agents` | Agent configuration, execution patterns |

## Directory Structure

```
go-lit/
├── cmd/server/          # Server entry point
├── internal/
│   ├── agents/          # Agents domain (extracted from agent-lab)
│   ├── api/             # API module assembly
│   └── config/          # Simplified config (no database)
├── pkg/                 # Shared infrastructure (from agent-lab)
├── web/
│   ├── app/             # Lit client + Go module
│   │   ├── client/      # TypeScript source
│   │   ├── dist/        # Built assets (gitignored)
│   │   └── server/      # Shell template
│   └── scalar/          # OpenAPI documentation
├── config.toml          # Server configuration
└── agents.json          # Seed data
```

## Client Structure

```
web/app/client/
├── app.ts               # Entry point
├── design/              # CSS architecture
├── router/              # Custom client-side router
├── shared/              # Cross-domain infrastructure
│   ├── api.ts           # API client
│   └── types.ts         # Shared types (Result, PageResult)
└── agents/              # Agents domain
    ├── views/           # Router targets, provide services
    ├── components/      # Stateful, consume services
    ├── elements/        # Stateless, pure attribute/event
    ├── services/        # Service implementations
    ├── interfaces.ts    # Service contracts
    ├── types.ts         # Domain types
    └── context.ts       # Lit context definitions
```
