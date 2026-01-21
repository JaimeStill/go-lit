# Go + Lit Architecture

## Hard Boundary Rule

**Go owns data and routing. Lit owns presentation.**

This is a hard architectural rule, not a guideline:
- Go never renders view-specific markup
- Lit never assumes server behavior beyond API contracts
- The shell template is static; client router decides what renders

## Server Architecture

### Single Shell Pattern

One `app.html` template serves all `/app/*` routes:

```html
<base href="{{ .BasePath }}/">
<title>{{ .Title }} - Go Lit</title>
<link rel="stylesheet" href="dist/{{ .Bundle }}.css">
<main id="app-content"></main>
<script type="module" src="dist/{{ .Bundle }}.js"></script>
```

Go has **no awareness** of which view component will render. It serves the shell and the client router takes over.

### Embedded Assets

Assets are embedded via `//go:embed` for single-binary deployment:
- Build client first: `cd web && bun run build`
- Then run server: `go run ./cmd/server`

## Client Architecture

### Three-Tier Component Hierarchy

| Tier | Location | Responsibility |
|------|----------|----------------|
| **View** | `views/` | Router target, initializes services, provides via context |
| **Stateful** | `components/` | Consumes services via context, handles events |
| **Stateless** | `elements/` | Pure: attributes in, events out, no context |

### View Components

Router targets that initialize and provide services:

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

### Stateful Components

Consume services, coordinate state, handle events:

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

### Stateless Elements

Pure components with no service awareness:

```typescript
@customElement('al-agent-card')
export class AgentCard extends LitElement {
  @property({ type: Object }) agent!: Agent;
  // Emits events only, no context consumption
}
```

## Service Architecture

### Interface-Based Contracts

Services define interfaces, factory functions return implementations:

```typescript
// interfaces.ts
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

// services/agent-service.ts
export function createAgentService(): AgentService {
  const agents = signal<Agent[]>([]);
  // ... implementation
}
```

### Context Definitions

```typescript
// context.ts
import { createContext } from '@lit/context';
import type { AgentService } from './interfaces';

export const agentServiceContext = createContext<AgentService>('agent-service');
```

## Router Design

Static route-to-component mapping:

```typescript
export const routes: Record<string, RouteConfig> = {
  '': { component: 'al-home-view', title: 'Home' },
  'agents': { component: 'al-agents-list-view', title: 'Agents' },
  'agents/:id': { component: 'al-agent-detail-view', title: 'Agent' },
};
```

Router extracts params and passes them as attributes:
```typescript
// For path /agents/123, router creates:
const el = document.createElement('al-agent-detail-view');
el.setAttribute('id', '123');
container.appendChild(el);
```

## Event Flow

Events propagate up only to the **stateful component boundary**:
- Stateless elements emit events
- Stateful components catch and handle (call service methods)
- Views provide services but don't handle domain events

## API Client Pattern

```typescript
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export const api = {
  async get<T>(path: string, params?: Record<string, any>): Promise<Result<T>> {
    // ... implementation
  },
  async post<T>(path: string, body: any): Promise<Result<T>> { /* ... */ },
  async put<T>(path: string, body: any): Promise<Result<T>> { /* ... */ },
  async del(path: string): Promise<Result<void>> { /* ... */ },
};
```
