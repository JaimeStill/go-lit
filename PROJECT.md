# Go + Lit Architecture POC

## Vision

Validate the Go + Lit web application architecture before retrofitting [agent-lab](https://github.com/JaimeStill/agent-lab). This POC focuses on the agents domain with Chat + ChatStream capabilities as a minimal validation scope.

## Architecture Principles

1. **Hard boundary**: Go owns data/routing, Lit owns presentation entirely
2. **Single shell**: One `app.html` serves all `/app/*` routes; Go has no view awareness
3. **Three-tier components**: View (provides) → Stateful (consumes) → Stateless (pure)
4. **Services**: Interface-based contracts, provided via `@lit/context`
5. **Signals**: `@lit-labs/signals` with `SignalWatcher` for reactive state
6. **Custom router**: Static mapping, param extraction, attribute passing

## Session Roadmap

### Session 1: Foundation

- [ ] Go server extraction (pkg/, internal/agents, internal/config, cmd/server)
- [ ] Web infrastructure (scalar module, vite.client.ts, vite.config.ts)
- [ ] Client foundation (package.json, tsconfig.json, design/, router)
- [ ] Shared infrastructure (api.ts, types.ts)
- [ ] Basic shell template

### Session 2: Components + UI

- [ ] Service architecture (interfaces, context, implementations)
- [ ] View components (agents-list, agent-detail, agent-execute)
- [ ] Stateful components (agent-list, agent-form, execution-panel)
- [ ] Stateless elements (al-button, al-input, al-card)
- [ ] Chat/ChatStream execution with SSE

## Project Structure

```
go-lit/
├── cmd/server/
│   ├── main.go              # Entry point
│   ├── server.go            # Lifecycle coordination
│   └── http.go              # HTTP server wrapper
├── internal/
│   ├── config/config.go     # Simplified TOML config (no database)
│   ├── agents/
│   │   ├── agent.go         # Types (from agent-lab)
│   │   ├── errors.go        # Domain errors (from agent-lab)
│   │   ├── handler.go       # HTTP handlers (from agent-lab)
│   │   ├── requests.go      # Request types (from agent-lab)
│   │   ├── openapi.go       # OpenAPI spec (from agent-lab)
│   │   ├── store.go         # In-memory storage with seed
│   │   └── system.go        # System interface + implementation
│   └── api/api.go           # API module assembly
├── pkg/
│   ├── handlers/            # JSON response utilities
│   ├── middleware/          # CORS, logging
│   ├── module/              # HTTP module routing
│   ├── openapi/             # OpenAPI spec builder
│   ├── pagination/          # PageRequest/PageResult
│   ├── routes/              # Route definitions
│   └── web/                 # Template infrastructure
│       └── views.go         # ViewDef, ViewData, TemplateSet
├── web/
│   ├── vite.client.ts       # Multi-client vite config merger
│   ├── vite.config.ts       # Merges app + scalar configs
│   ├── app/
│   │   ├── app.go           # App module (shell + assets)
│   │   ├── client.config.ts # App client vite config
│   │   ├── client/
│   │   │   ├── app.ts       # Entry point
│   │   │   ├── design/      # CSS architecture
│   │   │   ├── router/      # Custom router
│   │   │   ├── shared/      # Cross-domain infrastructure
│   │   │   └── agents/      # Agents domain
│   │   ├── dist/            # Built assets (gitignored)
│   │   ├── public/          # Favicons, manifest
│   │   └── server/
│   │       └── layouts/
│   │           └── app.html # Shell template
│   └── scalar/
│       ├── scalar.go        # Scalar module (OpenAPI docs)
│       ├── client.config.ts # Scalar client vite config
│       ├── app.ts           # Scalar entry point
│       └── index.html       # Scalar template
├── config.toml              # Server config
├── agents.json              # Seed data
└── go.mod
```

## Implementation Details

### Go Server

**Shell Template** (`web/app/server/layouts/app.html`):
```html
<!DOCTYPE html>
<html lang="en">
<head>
  <base href="{{ .BasePath }}/">
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{{ .Title }} - Go Lit</title>
  <link rel="stylesheet" href="dist/{{ .Bundle }}.css">
</head>
<body>
  <nav class="app-nav">
    <a href="." class="brand">Go Lit</a>
    <a href="agents">Agents</a>
  </nav>
  <main id="app-content"></main>
  <script type="module" src="dist/{{ .Bundle }}.js"></script>
</body>
</html>
```

**App Module** (`web/app/app.go`):
```go
var views = []web.ViewDef{
    // Single view - shell serves all routes, client router handles the rest
    {Route: "/{path...}", Template: "app.html", Title: "App", Bundle: "app"},
}

func NewModule(basePath string) (*module.Module, error) {
    ts, err := web.NewTemplateSet(layoutFS, viewFS, "server/layouts/*.html", "server/views", basePath, views)
    // ... build router with ts.PageHandler("app.html", views[0]) for catch-all
}
```

### Client Infrastructure

**Dependencies:**
```json
{
  "dependencies": {
    "lit": "^3.0.0",
    "@lit/context": "^1.0.0",
    "@lit-labs/signals": "^1.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**Routes Map** (`web/app/client/router/routes.ts`):
```typescript
export const routes: Record<string, RouteConfig> = {
  '': { component: 'al-home-view', title: 'Home' },
  'agents': { component: 'al-agents-list-view', title: 'Agents' },
  'agents/:id': { component: 'al-agent-detail-view', title: 'Agent' },
  'agents/:id/execute': { component: 'al-agent-execute-view', title: 'Execute' },
};
```

**API Client** (`web/app/client/shared/types.ts`):
```typescript
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
```

### Component Patterns

**View Component** - Initialize and provide services:
```typescript
@customElement('al-agents-list-view')
export class AgentsListView extends SignalWatcher(LitElement) {
  @provide({ context: agentServiceContext })
  private agentService: AgentService = createAgentService();

  connectedCallback() {
    super.connectedCallback();
    this.agentService.list();
  }
}
```

**Stateful Component** - Consume services, handle events:
```typescript
@customElement('al-agent-list')
export class AgentList extends SignalWatcher(LitElement) {
  @consume({ context: agentServiceContext })
  private agentService!: AgentService;

  private handleDelete(e: CustomEvent<{ id: string }>) {
    this.agentService.delete(e.detail.id);
  }
}
```

**Stateless Element** - Pure attribute/event component:
```typescript
@customElement('al-agent-card')
export class AgentCard extends LitElement {
  @property({ type: Object }) agent!: Agent;
  // Emits events, no service awareness
}
```

### Service Architecture

**Interface-Based Contracts:**
```typescript
export interface AgentService {
  agents: Signal<Agent[]>;
  loading: Signal<boolean>;
  error: Signal<string | null>;

  list(params?: PageRequest): Promise<Result<PageResult<Agent>>>;
  find(id: string): Promise<Result<Agent>>;
  create(cmd: AgentCommand): Promise<Result<Agent>>;
  update(id: string, cmd: AgentCommand): Promise<Result<Agent>>;
  delete(id: string): Promise<Result<void>>;
}
```

**Factory Functions:**
```typescript
export function createAgentService(): AgentService {
  const agents = signal<Agent[]>([]);
  const loading = signal(false);
  const error = signal<string | null>(null);
  // ... implementation
}
```

## Development Workflow

Since assets are embedded via `//go:embed`, the client must be built before the Go server can serve them.

```bash
# Build client assets
cd web && bun run build

# Run server (serves embedded assets)
go run ./cmd/server

# Access app at http://localhost:8080/app/
# Access API docs at http://localhost:8080/scalar
# Make changes → rebuild → refresh browser
```

## Production Build

```bash
# Build all clients (app + scalar)
cd web && bun run build

# Build server
go build -o bin/server ./cmd/server

# Run
./bin/server
```

## Verification Checklist

**Server:**
- [ ] Go serves static shell for all `/app/*` routes (no view awareness)
- [ ] Go serves JSON API at `/api/*`
- [ ] Go serves OpenAPI spec at `/api/openapi.json`
- [ ] Scalar UI accessible at `/scalar`
- [ ] Agents seed from JSON file on startup
- [ ] Template variables render correctly (BasePath, Title, Bundle)

**Multi-Client Build:**
- [ ] `bun run build` in `web/` builds both app and scalar
- [ ] Assets output to correct locations (`app/dist/`, `scalar/`)
- [ ] Aliases resolve correctly (@app/design, @app/shared, etc.)

**Router:**
- [ ] Router mounts correct component based on path
- [ ] Route params passed as attributes
- [ ] Browser back/forward works (popstate)
- [ ] Internal link clicks intercepted (no full page reload)

**Component Hierarchy:**
- [ ] View components provide services via `@provide()`
- [ ] Stateful components consume services via `@consume()`
- [ ] Stateless elements are pure (attributes in, events out)
- [ ] Events bubble to stateful boundary and stop

**State Management:**
- [ ] Signals trigger reactive updates via `SignalWatcher`
- [ ] Service signals shared across consuming components

**Functionality:**
- [ ] Agent CRUD operations work (list, create, update, delete)
- [ ] Chat execution works (request → response)
- [ ] Chat streaming works via SSE

## Source Material

Extracted and adapted from [agent-lab](https://github.com/JaimeStill/agent-lab):
- `pkg/handlers/`, `pkg/middleware/`, `pkg/module/`, `pkg/openapi/`, `pkg/pagination/`, `pkg/routes/`
- `pkg/web/` - ViewDef, ViewData, TemplateSet
- `internal/agents/` - agent.go, errors.go, handler.go, requests.go, openapi.go
- `web/scalar/` - Scalar module
- `web/vite.client.ts` - Multi-client vite configuration

## Post-POC

Once validated, the patterns established here will inform:
- `.claude/skills/web-development/SKILL.md` updates in agent-lab
- `web/app/client/` restructure following domain organization
- Milestone 5 rebuild from the emergent architectural foundation
