# Go + Lit Architecture POC

## Vision

Validate the Go + Lit web application architecture defined in [go-lit-architecture.md](https://github.com/JaimeStill/agent-lab/blob/main/_context/concepts/go-lit-architecture.md) before retrofitting [agent-lab](https://github.com/JaimeStill/agent-lab). This POC focuses on chat/vision execution with client-side config management as a minimal validation scope.

## Architecture Principles

1. **Hard boundary**: Go owns data/routing, Lit owns presentation entirely
2. **Single shell**: One `app.html` serves all `/app/*` routes; Go has no view awareness
3. **Three-tier components**: View (provides) → Stateful (consumes) → Stateless (pure)
4. **Services**: Interface-based contracts, provided via `@lit/context`
5. **Signals**: `@lit-labs/signals` with `SignalWatcher` for reactive state
6. **Custom router**: Static mapping, param extraction, attribute passing

## Session Roadmap

### Session 1: Foundation ✓

- [x] Go server extraction (pkg/, internal/agents, internal/config, cmd/server)
- [x] Modules pattern (cmd/server/modules.go)
- [x] Web infrastructure (scalar module, vite configs, tsconfig)
- [x] Layout + view template pattern (app.html + home.html)
- [x] Design system CSS layers
- [x] Minimal app.ts entry point (CSS import only)

### Session 2: Client Application ✓

- [x] Router implementation (static mapping, param extraction, history API)
- [x] Shared infrastructure (api.ts, types.ts, json-editor element)
- [x] Config domain (localStorage-based config management)
- [x] Execution domain (chat streaming via SSE)
- [x] View components (home, config-list, config-edit, execute)
- [x] Update app.go to catch-all route for client routing

### Session 3: Polish & Completion ✓

- [x] App header with navigation (persistent across routes)
- [x] Config selector auto-selection from route param
- [x] Vision execution support (image upload with object URL lifecycle management)
- [x] Config card grid layout (consistent sizing, space-between actions)
- [x] Responsive expand/collapse for config editor
- [x] Auto-scroll chat during streaming
- [x] Final layout/styling review

---

## Project Structure

```
go-lit/
├── cmd/server/
│   ├── main.go              # Entry point
│   ├── server.go            # Server struct, lifecycle
│   ├── modules.go           # Modules struct, NewModules, Mount
│   └── http.go              # HTTP server wrapper
├── internal/
│   ├── config/              # Server configuration (TOML)
│   ├── agents/
│   │   ├── errors.go        # Domain errors
│   │   ├── handler.go       # ChatStream, VisionStream handlers
│   │   ├── requests.go      # ChatStreamRequest, VisionForm
│   │   └── openapi.go       # OpenAPI spec definitions
│   └── api/api.go           # API module assembly
├── pkg/                     # Shared infrastructure (from agent-lab)
│   ├── handlers/            # JSON response utilities
│   ├── lifecycle/           # Shutdown coordination
│   ├── middleware/          # CORS, logging
│   ├── module/              # HTTP module routing
│   ├── openapi/             # OpenAPI spec builder
│   └── web/                 # Template infrastructure (views.go)
├── web/
│   ├── package.json         # Bun dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── vite.config.ts       # Merges app + scalar configs
│   ├── vite.client.ts       # Multi-client vite config merger
│   ├── app/
│   │   ├── app.go           # App module (embeds assets)
│   │   ├── client.config.ts # App vite config
│   │   ├── client/
│   │   │   ├── app.ts       # Entry point
│   │   │   └── design/      # CSS layers (styles, reset, theme, layout, components)
│   │   ├── dist/            # Built assets (gitignored)
│   │   ├── public/          # Favicons, manifest
│   │   └── server/
│   │       ├── layouts/
│   │       │   └── app.html # Shell template with content block
│   │       └── views/
│   │           └── home.html # Placeholder (Session 1)
│   └── scalar/              # OpenAPI documentation module
├── config.toml              # Server configuration
└── go.mod
```

---

## Session 1 Implementation (Complete)

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
  <link rel="icon" type="image/x-icon" href="favicon.ico">
  <link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="favicon-32x32.png">
  <link rel="icon" type="image/png" sizes="16x16" href="favicon-16x16.png">
  <link rel="stylesheet" href="dist/{{ .Bundle }}.css">
</head>
<body>
  <main id="app-content">
    {{ block "content" . }}{{ end }}
  </main>
  <script type="module" src="dist/{{ .Bundle }}.js"></script>
</body>
</html>
```

**View Template** (`web/app/server/views/home.html`):
```html
{{ define "content" }}
<h1>Go-Lit</h1>
<p>Shell rendered successfully. Client infrastructure coming in Session 2.</p>
{{ end }}
```

**App Module** (`web/app/app.go`):
```go
var views = []web.ViewDef{
    {Route: "/{$}", Template: "home.html", Title: "Home", Bundle: "app"},
}

func NewModule(basePath string) (*module.Module, error) {
    ts, err := web.NewTemplateSet(layoutFS, viewFS, "server/layouts/*.html", "server/views", basePath, views)
    // ...
    router := buildRouter(ts)
    return module.New(basePath, router), nil
}
```

### API Endpoints

| Method | Path | Content-Type | Description |
|--------|------|--------------|-------------|
| POST | `/api/chat` | `application/json` | Stream chat response via SSE |
| POST | `/api/vision` | `multipart/form-data` | Stream vision response via SSE |
| GET | `/api/openapi.json` | `application/json` | OpenAPI specification |

**ChatStreamRequest** (`POST /api/chat`):
```json
{
  "config": {
    "name": "agent-name",
    "system_prompt": "You are...",
    "client": { "timeout": "24s", ... },
    "provider": { "name": "ollama", "base_url": "http://localhost:11434" },
    "model": { "name": "llama3.2:3b", "capabilities": { "chat": { ... } } }
  },
  "prompt": "User message here"
}
```

**VisionForm** (`POST /api/vision`):
```
config: JSON-encoded AgentConfig
prompt: Vision prompt text
images[]: Image files (multipart)
```

**SSE Response Format**:
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","model":"llama3.2:3b","choices":[{"index":0,"delta":{"role":"assistant","content":"token"},"finish_reason":null}]}

data: {"id":"chatcmpl-123",...,"choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

### Dependencies

```json
{
  "dependencies": {
    "lit": "^3.3.2",
    "@lit/context": "^1.1.6",
    "@lit-labs/signals": "^0.2.0"
  },
  "devDependencies": {
    "@scalar/api-reference": "^1.43.10",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  }
}
```

---

## Session 2 Implementation Plan

### Phase 1: Router

**File:** `web/app/client/router/types.ts`
```typescript
export interface RouteConfig {
  component: string;
  title: string;
}

export interface RouteMatch {
  component: string;
  title: string;
  params: Record<string, string>;
}
```

**File:** `web/app/client/router/routes.ts`
```typescript
import type { RouteConfig } from './types';

export const routes: Record<string, RouteConfig> = {
  '': { component: 'gl-home-view', title: 'Home' },
  'config': { component: 'gl-config-list-view', title: 'Configurations' },
  'config/new': { component: 'gl-config-edit-view', title: 'New Configuration' },
  'config/:id': { component: 'gl-config-edit-view', title: 'Edit Configuration' },
  'execute': { component: 'gl-execute-view', title: 'Execute' },
  'execute/:id': { component: 'gl-execute-view', title: 'Execute' },
};
```

**File:** `web/app/client/router/router.ts`

Router responsibilities:
1. Read `location.pathname`, extract view segment relative to `/app/`
2. Match against static routes map, extract params from `:param` segments
3. Create component element, set param attributes
4. Mount to `#app-content` container
5. Intercept internal link clicks (`<a href>`) for `pushState`
6. Listen on `popstate` for browser back/forward
7. Update `document.title`

### Phase 2: Shared Infrastructure

**File:** `web/app/client/shared/types.ts`
```typescript
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: { role?: string; content?: string };
    finish_reason: string | null;
  }>;
}
```

**File:** `web/app/client/shared/api.ts`
```typescript
import type { Result } from './types';

const BASE = '/api';

export const api = {
  async post<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        return { ok: false, error: err.error || res.statusText };
      }
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  },

  chatStream(config: AgentConfig, prompt: string): ReadableStream<StreamingChunk> {
    // Return a ReadableStream that consumes SSE from /api/chat
  },

  visionStream(config: AgentConfig, prompt: string, images: File[]): ReadableStream<StreamingChunk> {
    // Return a ReadableStream that consumes SSE from /api/vision (multipart)
  },
};
```

### Phase 3: Config Domain

Agent configurations are stored client-side in localStorage. No server-side persistence.

**Directory:** `web/app/client/config/`

```
config/
├── types.ts           # AgentConfig type (mirrors go-agents)
├── interfaces.ts      # ConfigService interface
├── context.ts         # configServiceContext
├── services/
│   └── config-service.ts  # localStorage implementation
├── views/
│   ├── config-list-view.ts
│   └── config-edit-view.ts
├── components/
│   ├── config-list.ts
│   └── config-form.ts
└── elements/
    └── config-card.ts
```

**File:** `web/app/client/config/types.ts`
```typescript
export interface AgentConfig {
  id: string;           // UUID for localStorage key
  name: string;
  system_prompt: string;
  client: ClientConfig;
  provider: ProviderConfig;
  model: ModelConfig;
}

export interface ClientConfig {
  timeout: string;
  retry?: RetryConfig;
  connection_pool_size?: number;
  connection_timeout?: string;
}

export interface ProviderConfig {
  name: string;
  base_url: string;
  api_key?: string;
}

export interface ModelConfig {
  name: string;
  capabilities: {
    chat?: ChatCapabilities;
    vision?: VisionCapabilities;
  };
}
// ... additional types
```

**File:** `web/app/client/config/interfaces.ts`
```typescript
import type { Signal } from '@lit-labs/signals';
import type { AgentConfig } from './types';

export interface ConfigService {
  configs: Signal<AgentConfig[]>;
  loading: Signal<boolean>;

  list(): void;
  find(id: string): AgentConfig | undefined;
  save(config: AgentConfig): void;
  delete(id: string): void;
}
```

### Phase 4: Execution Domain

Handles chat and vision execution with SSE streaming.

**Directory:** `web/app/client/execution/`

```
execution/
├── types.ts           # ChatStreamRequest, execution state
├── interfaces.ts      # ExecutionService interface
├── context.ts         # executionServiceContext
├── services/
│   └── execution-service.ts
├── views/
│   └── execute-view.ts
├── components/
│   ├── chat-panel.ts
│   └── message-list.ts
└── elements/
    ├── message-bubble.ts
    └── prompt-input.ts
```

**File:** `web/app/client/execution/interfaces.ts`
```typescript
import type { Signal } from '@lit-labs/signals';
import type { AgentConfig } from '../config/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface ExecutionService {
  messages: Signal<Message[]>;
  streaming: Signal<boolean>;
  error: Signal<string | null>;
  currentResponse: Signal<string>;

  chat(config: AgentConfig, prompt: string): Promise<void>;
  vision(config: AgentConfig, prompt: string, images: File[]): Promise<void>;
  clear(): void;
}
```

### Phase 5: View Components

**Component Hierarchy Example:**

```
gl-execute-view (provides: configService, executionService)
├── gl-config-selector (consumes: configService)
│   └── gl-config-card (stateless)
├── gl-chat-panel (consumes: executionService)
│   ├── gl-message-list (consumes: executionService)
│   │   └── gl-message-bubble (stateless)
│   └── gl-prompt-input (stateless)
```

**File:** `web/app/client/views/home-view.ts`
```typescript
import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('gl-home-view')
export class HomeView extends LitElement {
  static styles = css`
    :host { display: block; padding: var(--space-6); }
    h1 { margin-bottom: var(--space-4); }
  `;

  render() {
    return html`
      <h1>Go-Lit</h1>
      <p>A Go + Lit architecture proof of concept.</p>
      <nav>
        <a href="config">Manage Configurations</a>
        <a href="execute">Execute</a>
      </nav>
    `;
  }
}
```

### Phase 6: App Entry Point Update

**File:** `web/app/client/app.ts`
```typescript
import './design/styles.css';

// Router
import { Router } from './router/router';

// Views (router targets)
import './views/home-view';
import './config/views/config-list-view';
import './config/views/config-edit-view';
import './execution/views/execute-view';

// Initialize router
const router = new Router('app-content');
router.start();
```

### Phase 7: Update app.go for Client Routing

Change from single `/{$}` route to catch-all `/{path...}` so the client router handles all `/app/*` paths:

**File:** `web/app/app.go` (updated)
```go
var views = []web.ViewDef{
    {Route: "/{path...}", Template: "shell.html", Title: "Go Lit", Bundle: "app"},
}
```

Rename `home.html` to `shell.html` (or create new) - this becomes a minimal shell since client router handles content:
```html
{{ define "content" }}
<!-- Client router mounts components here -->
{{ end }}
```

---

## Component Patterns Reference

### View Component (provides services)
```typescript
@customElement('gl-config-list-view')
export class ConfigListView extends SignalWatcher(LitElement) {
  @provide({ context: configServiceContext })
  private configService: ConfigService = createConfigService();

  connectedCallback() {
    super.connectedCallback();
    this.configService.list();
  }

  render() {
    return html`<gl-config-list></gl-config-list>`;
  }
}
```

### Stateful Component (consumes services)
```typescript
@customElement('gl-config-list')
export class ConfigList extends SignalWatcher(LitElement) {
  @consume({ context: configServiceContext })
  private configService!: ConfigService;

  private handleDelete(e: CustomEvent<{ id: string }>) {
    this.configService.delete(e.detail.id);
  }

  render() {
    return html`
      ${this.configService.configs.value.map(config => html`
        <gl-config-card
          .config=${config}
          @delete=${this.handleDelete}
        ></gl-config-card>
      `)}
    `;
  }
}
```

### Stateless Element (pure)
```typescript
@customElement('gl-config-card')
export class ConfigCard extends LitElement {
  @property({ type: Object }) config!: AgentConfig;

  private handleDelete() {
    this.dispatchEvent(new CustomEvent('delete', {
      detail: { id: this.config.id },
      bubbles: true,
      composed: true,
    }));
  }

  render() {
    return html`
      <div class="card">
        <h3>${this.config.name}</h3>
        <p>${this.config.provider.name} / ${this.config.model.name}</p>
        <button @click=${this.handleDelete}>Delete</button>
      </div>
    `;
  }
}
```

---

## Development Workflow

```bash
# Build client assets
cd web && bun run build

# Run server (serves embedded assets)
go run ./cmd/server

# Access points:
# - http://localhost:8080/app/     - Web application
# - http://localhost:8080/scalar/  - API documentation
# - http://localhost:8080/healthz  - Health check
```

---

## Verification Checklist

### Session 1 (Complete)
- [x] `go vet ./...` passes
- [x] `go run ./cmd/server` starts without errors
- [x] `GET /healthz` returns OK
- [x] `GET /app/` renders shell with CSS applied
- [x] `GET /scalar/` renders API documentation
- [x] `POST /api/chat` streams SSE response
- [x] `cd web && bun run build` generates dist assets

### Session 2 (Complete)
- [x] Router mounts correct component based on path
- [x] Route params passed as attributes
- [x] Browser back/forward works (popstate)
- [x] Internal links navigate without page reload
- [x] ConfigService persists to localStorage
- [x] ExecutionService consumes SSE stream
- [x] View components provide services via `@provide()`
- [x] Stateful components consume via `@consume()`
- [x] Stateless elements are pure (attributes in, events out)
- [x] Chat execution works end-to-end
- [x] Vision execution works with image upload

### Session 3 (Complete)
- [x] App header renders on all routes
- [x] Navigation links work from header
- [x] Config selector reflects route param selection
- [x] Vision execution with image upload
- [x] Config cards have consistent grid sizing
- [x] Config editor actions above editor
- [x] JSON editor fills available space
- [x] Responsive expand/collapse for config editor
- [x] Chat auto-scrolls during streaming

---

## Source Material

- [go-lit-architecture.md](https://github.com/JaimeStill/agent-lab/blob/main/_context/concepts/go-lit-architecture.md) - Architecture specification
- [agent-lab](https://github.com/JaimeStill/agent-lab) - pkg/, web/ infrastructure
- [go-agents](https://github.com/JaimeStill/go-agents) - AgentConfig structure, execution patterns

---

## Post-POC

Once validated, the patterns established here will inform:

- `.claude/skills/web-development/SKILL.md` updates in agent-lab
- `web/app/client/` restructure following domain organization
- Milestone 5 rebuild from the emergent architectural foundation

### Web Development Standardization

Patterns to codify in agent-lab web development skill:

- **Single base Vite alias**: `@app` → `client/` (zero maintenance vs wildcard patterns)
- **External component styles**: Co-located `.css` files with `?inline` imports + `unsafeCSS()` (see `_context/future/native-css-imports.md` for migration path)
- **Design directory structure**: `design/core/` for foundational system (tokens, reset, theme, layout utilities), `design/app/` for application-specific infrastructure (shell styles, Shadow DOM element styles), `design/index.css` as entry point
- **Shadow DOM base styles**: Components `@import '@app/design/app/elements.css'` for reset fundamentals and commonly-used element/utility styles; all colors use tokens (never hardcoded values)
- **Consolidated service infrastructure**: Single `service.ts` per domain exports context, interface, and factory
- **DRY handlers**: Extract repeated callback patterns into reusable named functions
- **Template render methods**: Extract complex conditionals and interpolations into private `renderXxx()` methods
- **App-shell scroll architecture**: See dedicated section below for viewport and scroll management
- **HTMLElement property avoidance**: Use `configId` instead of `id`, `heading` instead of `title` to avoid conflicts with HTMLElement base properties

### Template Render Methods Convention

Use private `renderXxx()` methods to encapsulate complex template logic:

```typescript
import { LitElement, html, nothing } from 'lit';

@customElement('gl-example')
export class Example extends LitElement {
  // Use for conditional rendering
  private renderError() {
    const error = this.service.error.get();
    if (!error) return nothing;  // Lit sentinel for "render nothing"

    return html`<div class="error">${error}</div>`;
  }

  // Use for complex interpolations
  private renderSummary() {
    const text = this.data.summary;
    if (!text) return nothing;

    const display = text.length > 100 ? `${text.slice(0, 100)}...` : text;
    return html`<p class="summary">${display}</p>`;
  }

  // Use for conditional component variations
  private renderButton() {
    if (this.streaming) {
      return html`<button class="btn-danger" @click=${this.handleCancel}>Cancel</button>`;
    }
    return html`<button class="btn-primary" @click=${this.handleSubmit}>Send</button>`;
  }

  render() {
    return html`
      ${this.renderError()}
      ${this.renderSummary()}
      ${this.renderButton()}
    `;
  }
}
```

**When to use:**
- Conditional rendering (empty states, error banners, loading indicators)
- Complex string interpolations (truncation, formatting)
- Mutually exclusive template branches (send/cancel buttons)
- Collection mapping (lists, grids of items)
- Any logic that obscures the main template structure

**Collection rendering pattern:**
```typescript
private renderConfigs(configs: AgentConfig[]) {
  return configs.map(
    (config) => html`
      <gl-config-card
        .config=${config}
        @edit=${this.handleEdit}
      ></gl-config-card>
    `
  );
}

render() {
  const configs = this.configService.configs.get();
  return html`<div class="grid">${this.renderConfigs(configs)}</div>`;
}
```

Parameterizing with the collection makes dependencies explicit and keeps the method focused on rendering.

**Conventions:**
- Name methods `renderXxx()` where `Xxx` describes the content
- Return `nothing` (from `lit`) for conditional non-rendering, not `null`
- Keep methods focused on a single template concern
- Methods should be private (implementation detail)
- For collections, pass data as parameter rather than accessing state directly

### Form Handling Convention

Extract form values on submit using FormData rather than tracking every field change in component state:

```typescript
function buildConfigFromForm(form: HTMLFormElement, id: string): AgentConfig {
  const data = new FormData(form);

  return {
    id,
    name: data.get('name') as string,
    system_prompt: (data.get('system_prompt') as string) || undefined,
    provider: {
      name: data.get('provider_name') as string,
      base_url: data.get('base_url') as string,
    },
    // ...
  };
}

@customElement('gl-config-form')
export class ConfigForm extends LitElement {
  @property({ type: String }) configId?: string;

  private get config(): AgentConfig {
    if (this.configId) {
      const existing = this.configService.find(this.configId);
      if (existing) return existing;
    }
    return createDefaultConfig();  // Centralized defaults
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const config = buildConfigFromForm(form, this.config.id);
    this.configService.save(config);
    navigate('config');
  }

  render() {
    const { config } = this;

    return html`
      <form @submit=${this.handleSubmit}>
        <input name="name" .value=${config.name} required />
        <!-- ... -->
      </form>
    `;
  }
}
```

**Key principles:**
- Use `name` attributes on form inputs for FormData extraction
- Centralize defaults in a `createDefaultXxx()` function; getter returns existing or default
- Use `.value=${config.field}` to populate values (no null coalescing in templates)
- Encapsulate object construction in a standalone `buildXxxFromForm()` function
- Validation happens server-side; errors returned in response inform the UI
- Avoid tracking individual field state unless async validation is required (and prefer server-side validation even then)

### App-Shell Scroll Architecture

Use the app-shell model for viewport and scroll management. The body fills exactly the viewport and never scrolls; views manage their own internal scroll regions.

**Core CSS setup** (`design/app/app.css`):

```css
body {
  display: flex;
  flex-direction: column;
  height: 100dvh;      /* fixed viewport, not min-height */
  margin: 0;
  overflow: hidden;    /* body never scrolls */
}

.app-header {
  flex-shrink: 0;      /* header won't compress */
}

#app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;       /* allow shrinking below content size */
  overflow: hidden;    /* views manage their own scroll */
}

#app-content > * {
  flex: 1;
  min-height: 0;
}
```

**Key principles:**

| Pattern | Purpose |
|---------|---------|
| `height: 100dvh` | Fixed viewport (dvh adjusts for mobile browser UI) |
| `overflow: hidden` | Prevents scroll at this level, delegates to children |
| `flex: 1` | Fill available space in flex container |
| `min-height: 0` | Allow flex children to shrink below content size |
| `overflow-y: auto` | Create scroll region (only on leaf containers) |

**Avoid `height: 100%`** in flex/grid contexts. Percentage heights require explicit parent height, which flex/grid don't provide. Use `flex: 1` instead.

**Height chain for scroll boundaries:**
```
body (height: 100dvh, overflow: hidden)
└── #app-content (flex: 1, min-height: 0, overflow: hidden)
    └── view (flex: 1, min-height: 0)
        └── scrollable-region (overflow-y: auto)
```

Every ancestor in the chain needs constrained height for `overflow-y: auto` to create a scroll boundary.

**View CSS pattern:**
```css
:host {
  display: flex;
  flex-direction: column;
  /* no height needed - parent handles sizing */
}

.scrollable-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.fixed-footer {
  flex-shrink: 0;
}
```

**Grid layout with scroll regions:**
```css
:host {
  display: grid;
  grid-template-columns: 400px 1fr;
  grid-template-rows: auto 1fr;
  /* no height needed */
}

.panel-with-scroll {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}
```

### Host Attribute Reflection for CSS State

When component state needs to affect parent-level CSS (e.g., grid layout changes), reflect the state as a host attribute:

```typescript
@state() private expanded = false;

updated(changed: Map<string, unknown>) {
  if (changed.has('expanded')) {
    this.toggleAttribute('expanded', this.expanded);
  }
}
```

```css
:host {
  grid-template-rows: auto auto 1fr;
}

:host([expanded]) {
  grid-template-rows: auto 1fr 1fr;
}
```

This pattern enables CSS-driven layout changes based on component state without JavaScript style manipulation.

### Explicit Grid Placement for Conditional Rendering

When grid children are conditionally rendered, explicitly place elements that must stay in specific rows:

```css
/* Grid: help | actions | validation? | editor */
:host {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
}

/* Editor must always use row 4, even when validation isn't rendered */
gl-json-editor {
  grid-row: 4;
}
```

Without explicit placement, conditionally-rendered elements cause subsequent siblings to shift into wrong grid tracks.

### Object URL Lifecycle Management

When using `URL.createObjectURL()` for file previews, manage the lifecycle to prevent memory leaks:

```typescript
private imageUrls = new Map<File, string>();

disconnectedCallback() {
  super.disconnectedCallback();
  this.revokeAllUrls();
}

private getImageUrl(file: File): string {
  let url = this.imageUrls.get(file);
  if (!url) {
    url = URL.createObjectURL(file);
    this.imageUrls.set(file, url);
  }
  return url;
}

private revokeImageUrl(file: File) {
  const url = this.imageUrls.get(file);
  if (url) {
    URL.revokeObjectURL(url);
    this.imageUrls.delete(file);
  }
}

private revokeAllUrls() {
  this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
  this.imageUrls.clear();
}
```

### Auto-Scroll During Streaming

For chat interfaces with streaming content, auto-scroll to keep latest content visible:

```typescript
updated() {
  if (this.streaming) {
    this.scrollToBottom();
  }
}

private scrollToBottom() {
  this.scrollTop = this.scrollHeight;
}
```

When the component's `:host` is the scroll container (`overflow-y: auto`), use `this.scrollTop` directly on the LitElement.
