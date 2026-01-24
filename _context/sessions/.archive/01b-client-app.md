# Session 01b: Client Application Implementation Guide

## Overview

Implement the Lit web client with client-side routing, localStorage-based config management, and SSE streaming for chat/vision execution.

---

## Phase 0: Vite Config Update

### File: `web/app/client.config.ts`

Replace entire file contents:

```typescript
import { resolve } from 'path';
import type { ClientConfig } from '../vite.client';

const root = __dirname;

const config: ClientConfig = {
  name: 'app',
  aliases: {
    '@app': resolve(root, 'client'),
  },
};

export default config;
```

---

## Phase 0.5: Design Infrastructure

Reorganize the design directory to separate global styles from component styles, and isolate tokens from styles that use them.

### Directory Structure

```
design/
├── styles.css              # Entry point for global styles
├── global/
│   ├── tokens.css          # All CSS custom properties
│   ├── reset.css           # Reset styles
│   ├── theme.css           # Color application
│   └── layout.css          # Layout utilities
└── components/
    └── elements.css        # Minimal reset for Shadow DOM
```

### File: `web/app/client/design/styles.css` (replace)

```css
@layer tokens, reset, theme, layout;

@import url(./global/tokens.css);
@import url(./global/reset.css);
@import url(./global/theme.css);
@import url(./global/layout.css);
```

### File: `web/app/client/design/global/tokens.css` (new)

```css
@layer tokens {
  :root {
    /* Color scheme */
    color-scheme: dark light;

    /* Fonts */
    --font-sans: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    --font-mono: ui-monospace, "Cascadia Code", "Source Code Pro", Menlo, Consolas, "DejaVu Sans Mono", monospace;

    /* Spacing */
    --space-1: 0.25rem;
    --space-2: 0.5rem;
    --space-3: 0.75rem;
    --space-4: 1rem;
    --space-5: 1.25rem;
    --space-6: 1.5rem;
    --space-8: 2rem;
    --space-10: 2.5rem;
    --space-12: 3rem;
    --space-16: 4rem;

    /* Typography */
    --text-xs: 0.75rem;
    --text-sm: 0.875rem;
    --text-base: 1rem;
    --text-lg: 1.125rem;
    --text-xl: 1.25rem;
    --text-2xl: 1.5rem;
    --text-3xl: 1.875rem;
    --text-4xl: 2.25rem;
  }

  /* Dark theme colors */
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: hsl(0, 0%, 7%);
      --bg-1: hsl(0, 0%, 12%);
      --bg-2: hsl(0, 0%, 18%);
      --color: hsl(0, 0%, 93%);
      --color-1: hsl(0, 0%, 80%);
      --color-2: hsl(0, 0%, 65%);
      --divider: hsl(0, 0%, 25%);

      --blue: hsl(210, 100%, 70%);
      --blue-bg: hsl(210, 50%, 20%);
      --green: hsl(140, 70%, 55%);
      --green-bg: hsl(140, 40%, 18%);
      --red: hsl(0, 85%, 65%);
      --red-bg: hsl(0, 50%, 20%);
      --yellow: hsl(45, 90%, 60%);
      --yellow-bg: hsl(45, 50%, 18%);
      --orange: hsl(25, 95%, 65%);
      --orange-bg: hsl(25, 50%, 20%);
    }
  }

  /* Light theme colors */
  @media (prefers-color-scheme: light) {
    :root {
      --bg: hsl(0, 0%, 100%);
      --bg-1: hsl(0, 0%, 96%);
      --bg-2: hsl(0, 0%, 92%);
      --color: hsl(0, 0%, 10%);
      --color-1: hsl(0, 0%, 30%);
      --color-2: hsl(0, 0%, 45%);
      --divider: hsl(0, 0%, 80%);

      --blue: hsl(210, 90%, 45%);
      --blue-bg: hsl(210, 80%, 92%);
      --green: hsl(140, 60%, 35%);
      --green-bg: hsl(140, 50%, 90%);
      --red: hsl(0, 70%, 50%);
      --red-bg: hsl(0, 70%, 93%);
      --yellow: hsl(45, 80%, 40%);
      --yellow-bg: hsl(45, 80%, 88%);
      --orange: hsl(25, 85%, 50%);
      --orange-bg: hsl(25, 75%, 90%);
    }
  }
}
```

### File: `web/app/client/design/global/reset.css` (move from design/)

```css
@layer reset {
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }

  * {
    margin: 0;
  }

  body {
    min-height: 100svh;
    line-height: 1.5;
  }

  img,
  picture,
  video,
  canvas,
  svg {
    display: block;
    max-width: 100%;
  }

  @media (prefers-reduced-motion: no-preference) {
    :has(:target) {
      scroll-behavior: smooth;
    }
  }
}
```

### File: `web/app/client/design/global/theme.css` (move from design/)

```css
@layer theme {
  body {
    font-family: var(--font-sans);
    background-color: var(--bg);
    color: var(--color);
  }

  pre,
  code {
    font-family: var(--font-mono);
  }
}
```

### File: `web/app/client/design/global/layout.css` (move from design/)

```css
@layer layout {
  .stack {
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
  }

  .stack-sm {
    gap: var(--space-2);
  }

  .cluster {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-4);
    align-items: center;
  }

  .cluster-sm {
    gap: var(--space-2);
  }

  .constrain {
    max-width: 24rem;
  }

  .align-start {
    align-self: flex-start;
  }

  .align-center {
    align-self: center;
  }

  .align-end {
    align-self: flex-end;
  }

  .align-stretch {
    align-self: stretch;
  }
}
```

### File: `web/app/client/design/components/elements.css` (new)

```css
/*
 * Base styles for Shadow DOM components.
 * Import in component CSS: @import '@app/design/components/elements.css';
 *
 * Contains:
 * - Reset fundamentals (box-sizing, margin)
 * - Commonly-used element styles (buttons, forms)
 * - Reusable utility classes
 *
 * All colors use design tokens for theme support.
 */

/* Reset */
*,
*::before,
*::after {
  box-sizing: border-box;
}

* {
  margin: 0;
}

/* Buttons */
button {
  padding: var(--space-2) var(--space-4);
  border: none;
  border-radius: 0.25rem;
  cursor: pointer;
  font-family: inherit;
  font-size: var(--text-sm);
  background: var(--bg-2);
  color: var(--color);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Button variants */
.btn-primary {
  background: var(--blue);
  color: var(--bg);
}

.btn-secondary {
  background: var(--bg-2);
  color: var(--color);
}

.btn-success {
  background: var(--green-bg);
  color: var(--green);
}

.btn-danger {
  background: var(--red-bg);
  color: var(--red);
}

.btn-info {
  background: var(--blue-bg);
  color: var(--blue);
}

/* Form elements */
input,
textarea,
select {
  padding: var(--space-2);
  border: 1px solid var(--divider);
  border-radius: 0.25rem;
  background: var(--bg-1);
  color: var(--color);
  font-family: inherit;
  font-size: var(--text-base);
}

input:focus,
textarea:focus,
select:focus {
  outline: none;
  border-color: var(--blue);
}

textarea {
  min-height: 100px;
  resize: vertical;
}

fieldset {
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  padding: var(--space-4);
}

legend {
  padding: 0 var(--space-2);
  font-weight: 600;
}

label {
  font-size: var(--text-sm);
  color: var(--color-1);
}

/* Links styled as buttons */
.link-btn {
  display: inline-block;
  padding: var(--space-2) var(--space-4);
  border-radius: 0.25rem;
  text-decoration: none;
  font-size: var(--text-sm);
  cursor: pointer;
}

.link-btn:hover {
  text-decoration: none;
}
```

### Delete: `web/app/client/design/components.css`

Remove this file - global component styles are ineffective with Shadow DOM.

### File: `web/app/client/css.d.ts` (new)

TypeScript declaration for CSS inline imports:

```typescript
declare module '*.css?inline' {
  const styles: string;
  export default styles;
}
```

This enables the `import styles from './component.css?inline'` pattern with Vite. Use `unsafeCSS(styles)` to convert the string to a CSSResult for Lit's `static styles`.

---

## Phase 1: Shared Infrastructure

### File: `web/app/client/shared/types.ts`

```typescript
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export interface StreamingChunk {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export type StreamCallback = (chunk: StreamingChunk) => void;
export type StreamErrorCallback = (error: string) => void;
export type StreamCompleteCallback = () => void;

export interface StreamOptions {
  onChunk: StreamCallback;
  onError?: StreamErrorCallback;
  onComplete?: StreamCompleteCallback;
  signal?: AbortSignal;
}
```

### File: `web/app/client/shared/api.ts`

```typescript
import type { Result, StreamingChunk, StreamOptions } from './types';

const BASE = '/api';
const SSE_DATA_PREFIX = 'data: ';
const SSE_DONE_SIGNAL = '[DONE]';

async function parseSSE(
  response: Response,
  options: StreamOptions
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    options.onError?.('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith(SSE_DATA_PREFIX)) continue;
      const data = line.slice(SSE_DATA_PREFIX.length).trim();

      if (data === SSE_DONE_SIGNAL) {
        options.onComplete?.();
        return;
      }

      try {
        const chunk = JSON.parse(data) as StreamingChunk;
        if ('error' in chunk) {
          options.onError?.((chunk as unknown as { error: string }).error);
          return;
        }
        options.onChunk(chunk);
      } catch {
        // Skip malformed chunks
      }
    }
  }

  options.onComplete?.();
}

function handleStreamResponse(options: StreamOptions) {
  return async (res: Response) => {
    if (!res.ok) {
      const text = await res.text();
      options.onError?.(text || res.statusText);
      return;
    }
    await parseSSE(res, options);
  };
}

function handleStreamError(options: StreamOptions) {
  return (err: Error) => {
    if (err.name !== 'AbortError') {
      options.onError?.(err.message);
    }
  };
}

export const api = {
  async post<T>(path: string, body: unknown): Promise<Result<T>> {
    try {
      const res = await fetch(`${BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          return { ok: false, error: json.error || res.statusText };
        } catch {
          return { ok: false, error: text || res.statusText };
        }
      }
      return { ok: true, data: await res.json() };
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) };
    }
  },

  chat(body: unknown, options: StreamOptions): AbortController {
    const controller = new AbortController();
    const signal = options.signal ?? controller.signal;

    fetch(`${BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    })
      .then(handleStreamResponse(options))
      .catch(handleStreamError(options));

    return controller;
  },

  vision(
    config: unknown,
    prompt: string,
    images: File[],
    options: StreamOptions
  ): AbortController {
    const controller = new AbortController();
    const signal = options.signal ?? controller.signal;

    const formData = new FormData();
    formData.append('config', JSON.stringify(config));
    formData.append('prompt', prompt);
    images.forEach((img) => formData.append('images[]', img));

    fetch(`${BASE}/vision`, {
      method: 'POST',
      body: formData,
      signal,
    })
      .then(handleStreamResponse(options))
      .catch(handleStreamError(options));

    return controller;
  },
};
```

### File: `web/app/client/shared/index.ts`

```typescript
export * from './types';
export { api } from './api';
```

### File: `web/app/client/shared/elements/json-editor.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  min-height: 0;
}

textarea {
  flex: 1;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  line-height: 1.5;
  resize: none;
  min-height: 0;
}

.error {
  padding: var(--space-2);
  background: var(--red-bg);
  color: var(--red);
  font-size: var(--text-sm);
  font-family: var(--font-mono);
  border-radius: 0.25rem;
}
```

### File: `web/app/client/shared/elements/json-editor.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './json-editor.css?inline';

export interface JsonChangeEvent {
  value: string;
  parsed: unknown | null;
  error: string | null;
}

/**
 * Generic JSON editor element.
 * Provides textarea with JSON parse validation.
 * Emits json-change events with parsed value or error.
 */
@customElement('gl-json-editor')
export class JsonEditor extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: String }) value = '';
  @property({ type: String }) placeholder = 'Enter JSON...';

  @state() private parseError: string | null = null;

  private handleInput(e: Event) {
    const value = (e.target as HTMLTextAreaElement).value;
    let parsed: unknown | null = null;
    let error: string | null = null;

    try {
      if (value.trim()) {
        parsed = JSON.parse(value);
      }
      this.parseError = null;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Invalid JSON';
      this.parseError = error;
    }

    this.dispatchEvent(
      new CustomEvent<JsonChangeEvent>('json-change', {
        detail: { value, parsed, error },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderError() {
    if (!this.parseError) return nothing;
    return html`<div class="error">${this.parseError}</div>`;
  }

  render() {
    return html`
      <textarea
        .value=${this.value}
        @input=${this.handleInput}
        placeholder=${this.placeholder}
        spellcheck="false"
      ></textarea>
      ${this.renderError()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-json-editor': JsonEditor;
  }
}
```

---

## Phase 2: Router

### File: `web/app/client/router/types.ts`

```typescript
export interface RouteConfig {
  component: string;
  title: string;
}

export interface RouteMatch {
  config: RouteConfig;
  params: Record<string, string>;
  query: Record<string, string>;
}
```

### File: `web/app/client/router/routes.ts`

```typescript
import type { RouteConfig } from './types';

export const routes: Record<string, RouteConfig> = {
  '': { component: 'gl-home-view', title: 'Home' },
  'config': { component: 'gl-config-list-view', title: 'Configurations' },
  'config/new': { component: 'gl-config-edit-view', title: 'New Configuration' },
  'config/:configId': { component: 'gl-config-edit-view', title: 'Edit Configuration' },
  'execute': { component: 'gl-execute-view', title: 'Execute' },
  'execute/:configId': { component: 'gl-execute-view', title: 'Execute' },
  '*': { component: 'gl-not-found-view', title: 'Not Found' },
};
```

### File: `web/app/client/router/router.ts`

```typescript
import { routes } from './routes';
import type { RouteMatch } from './types';

let routerInstance: Router | null = null;

export function navigate(path: string): void {
  routerInstance?.navigate(path);
}

export class Router {
  private container: HTMLElement;
  private basePath: string;

  constructor(containerId: string) {
    const el = document.getElementById(containerId);
    if (!el) throw new Error(`Container #${containerId} not found`);
    this.container = el;
    this.basePath =
      document.querySelector('base')?.getAttribute('href')?.replace(/\/$/, '') ??
      '/app';
    routerInstance = this;
  }

  start(): void {
    this.navigate(this.currentPath() + location.search, false);

    window.addEventListener('popstate', () => {
      this.navigate(this.currentPath() + location.search, false);
    });
  }

  navigate(path: string, pushState: boolean = true): void {
    const [pathPart, queryPart] = path.split('?');
    const normalized = this.normalizePath(pathPart);
    const query = this.parseQuery(queryPart);
    const match = this.match(normalized, query);

    if (pushState) {
      let fullPath = `${this.basePath}/${normalized}`.replace(/\/+/g, '/');
      if (queryPart) fullPath += `?${queryPart}`;
      history.pushState(null, '', fullPath);
    }

    document.title = `${match.config.title} - Go Lit`;
    this.mount(match);
  }

  private currentPath(): string {
    const pathname = location.pathname;
    if (pathname.startsWith(this.basePath)) {
      return pathname.slice(this.basePath.length).replace(/^\//, '');
    }
    return pathname.replace(/^\//, '');
  }

  private normalizePath(path: string): string {
    let normalized = path.replace(/^\//, '');
    const baseWithoutSlash = this.basePath.replace(/^\//, '');
    if (normalized.startsWith(baseWithoutSlash)) {
      normalized = normalized.slice(baseWithoutSlash.length).replace(/^\//, '');
    }
    return normalized;
  }

  private parseQuery(queryString?: string): Record<string, string> {
    if (!queryString) return {};

    const params = new URLSearchParams(queryString);
    const result: Record<string, string> = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  }

  private match(path: string, query: Record<string, string>): RouteMatch {
    const segments = path.split('/').filter(Boolean);

    if (routes[path]) {
      return { config: routes[path], params: {}, query };
    }

    for (const [pattern, config] of Object.entries(routes)) {
      if (pattern === '*') continue;

      const patternSegments = pattern.split('/').filter(Boolean);

      if (patternSegments.length !== segments.length) continue;

      const params: Record<string, string> = {};
      let matched = true;

      for (let i = 0; i < patternSegments.length; i++) {
        const pat = patternSegments[i];
        const seg = segments[i];

        if (pat.startsWith(':')) {
          params[pat.slice(1)] = seg;
        } else if (pat !== seg) {
          matched = false;
          break;
        }
      }

      if (matched) {
        return { config, params, query };
      }
    }

    return { config: routes['*'], params: { path }, query };
  }

  private mount(match: RouteMatch): void {
    this.container.innerHTML = '';
    const el = document.createElement(match.config.component);

    // Set route params as attributes
    for (const [key, value] of Object.entries(match.params)) {
      el.setAttribute(key, value);
    }

    // Set query params as attributes
    for (const [key, value] of Object.entries(match.query)) {
      el.setAttribute(key, value);
    }

    this.container.appendChild(el);
  }
}
```

### File: `web/app/client/router/index.ts`

```typescript
export * from './types';
export { routes } from './routes';
export { Router, navigate } from './router';
```

---

## Phase 3: Config Domain Infrastructure

### File: `web/app/client/config/types.ts`

```typescript
/**
 * Types aligned with go-agents pkg/config.
 * All fields except id and name are optional to support partial configs.
 * go-agents handles merging with defaults server-side.
 */

export type Duration = string; // e.g., "2m", "30s"

export interface RetryConfig {
  max_retries?: number;
  initial_backoff?: Duration;
  max_backoff?: Duration;
  backoff_multiplier?: number;
  jitter?: boolean;
}

export interface ClientConfig {
  timeout?: Duration;
  retry?: RetryConfig;
  connection_pool_size?: number;
  connection_timeout?: Duration;
}

export interface ProviderConfig {
  name?: string;
  base_url?: string;
  options?: Record<string, unknown>;
}

export interface ModelConfig {
  name?: string;
  capabilities?: Record<string, Record<string, unknown>>;
}

/**
 * AgentConfig for client-side storage.
 * - id: client-side UUID for localStorage key (not sent to API)
 * - name: required identifier
 * - All other fields optional; go-agents merges with defaults
 */
export interface AgentConfig {
  id: string;
  name: string;
  system_prompt?: string;
  client?: ClientConfig;
  provider?: ProviderConfig;
  model?: ModelConfig;
}

/**
 * Template for new configs with common fields.
 * Users can modify, paste full configs, or trim to minimal.
 */
export function createDefaultConfig(): AgentConfig {
  return {
    id: crypto.randomUUID(),
    name: 'New Agent',
    system_prompt: '',
    provider: {
      name: 'ollama',
      base_url: 'http://localhost:11434',
    },
    model: {
      name: '',
      capabilities: {
        chat: {},
      },
    },
  };
}
```

### File: `web/app/client/config/service.ts`

```typescript
import { createContext } from '@lit/context';
import { signal, Signal } from '@lit-labs/signals';
import type { AgentConfig } from './types';

export const configServiceContext = createContext<ConfigService>('config-service');

const STORAGE_KEY = 'gl-agent-configs';

export interface ConfigService {
  configs: Signal.State<AgentConfig[]>;
  loading: Signal.State<boolean>;

  list(): void;
  find(id: string): AgentConfig | undefined;
  save(config: AgentConfig): void;
  delete(id: string): void;
}

export function createConfigService(): ConfigService {
  const configs = signal<AgentConfig[]>([]);
  const loading = signal<boolean>(false);

  function persist(): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs.get()));
  }

  return {
    configs,
    loading,
    list(): void {
      loading.set(true);
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        configs.set(stored ? JSON.parse(stored) : []);
      } catch (e) {
        console.error('Failed to load configs:', e);
        configs.set([]);
      } finally {
        loading.set(false);
      }
    },
    find(id: string): AgentConfig | undefined {
      return configs.get().find((c) => c.id === id);
    },
    save(config: AgentConfig): void {
      const current = configs.get();
      const index = current.findIndex((c) => c.id === config.id);

      if (index >= 0) {
        const updated = [...current];
        updated[index] = config;
        configs.set(updated);
      } else {
        configs.set([...current, config]);
      }

      persist();
    },
    delete(id: string): void {
      configs.set(configs.get().filter((c) => c.id !== id));
      persist();
    }
  };
}
```

### File: `web/app/client/config/index.ts`

```typescript
export * from './types';
export * from './service';
```

---

## Phase 4: Execution Domain Infrastructure

### File: `web/app/client/execution/types.ts`

```typescript
import type { AgentConfig } from '@app/config/types';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface ChatRequest {
  config: Omit<AgentConfig, 'id'>;
  prompt: string;
}
```

### File: `web/app/client/execution/service.ts`

```typescript
import { createContext } from '@lit/context';
import { signal, Signal } from '@lit-labs/signals';
import { api } from '@app/shared';
import type { AgentConfig } from '@app/config/types';
import type { Message, ChatRequest } from './types';

export const executionServiceContext =
  createContext<ExecutionService>('execution-service');

export interface ExecutionService {
  messages: Signal.State<Message[]>;
  streaming: Signal.State<boolean>;
  error: Signal.State<string | null>;
  currentResponse: Signal.State<string>;

  chat(config: AgentConfig, prompt: string): void;
  vision(config: AgentConfig, prompt: string, images: File[]): void;
  cancel(): void;
  clear(): void;
}

export function createExecutionService(): ExecutionService {
  const messages = signal<Message[]>([]);
  const streaming = signal<boolean>(false);
  const error = signal<string | null>(null);
  const currentResponse = signal<string>('');

  let abortController: AbortController | null = null;

  function addUserMessage(content: string): void {
    messages.set([
      ...messages.get(),
      { role: 'user', content, timestamp: Date.now() },
    ]);
  }

  function handleChunk(chunk: { choices: Array<{ delta?: { content?: string } }> }): void {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      currentResponse.set(currentResponse.get() + content);
    }
  }

  function handleError(err: string): void {
    error.set(err);
    streaming.set(false);
    finalizeResponse();
  }

  function handleComplete(): void {
    streaming.set(false);
    finalizeResponse();
  }

  function finalizeResponse(): void {
    const response = currentResponse.get();
    if (response) {
      messages.set([
        ...messages.get(),
        { role: 'assistant', content: response, timestamp: Date.now() },
      ]);
      currentResponse.set('');
    }
  }

  return {
    messages,
    streaming,
    error,
    currentResponse,
    chat(config: AgentConfig, prompt: string): void {
      if (streaming.get()) return;

      error.set(null);
      streaming.set(true);
      addUserMessage(prompt);

      const { id: _, ...apiConfig } = config;
      const request: ChatRequest = { config: apiConfig, prompt };

      abortController = api.chat(request, {
        onChunk: handleChunk,
        onError: handleError,
        onComplete: handleComplete,
      });
    },
    vision(config: AgentConfig, prompt: string, images: File[]): void {
      if (streaming.get()) return;

      error.set(null);
      streaming.set(true);
      addUserMessage(`[Vision] ${prompt}`);

      const { id: _, ...apiConfig } = config;

      abortController = api.vision(apiConfig, prompt, images, {
        onChunk: handleChunk,
        onError: handleError,
        onComplete: handleComplete,
      });
    },
    cancel(): void {
      abortController?.abort();
      abortController = null;
      streaming.set(false);
      finalizeResponse();
    },
    clear(): void {
      this.cancel();
      messages.set([]);
      error.set(null);
    },
  };
}
```

### File: `web/app/client/execution/index.ts`

```typescript
export * from './types';
export * from './service';
```

---

## Phase 5: Config Domain Components

### File: `web/app/client/config/elements/config-card.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
  background: var(--bg-1);
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  padding: var(--space-4);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: var(--space-2);
}

.meta {
  color: var(--color-2);
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
```

### File: `web/app/client/config/elements/config-card.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { AgentConfig } from '../types';
import styles from './config-card.css?inline';

@customElement('gl-config-card')
export class ConfigCard extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Object }) config!: AgentConfig;

  private emit(name: string) {
    this.dispatchEvent(
      new CustomEvent(name, {
        detail: { id: this.config.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderMeta() {
    const provider = this.config.provider?.name;
    const model = this.config.model?.name;

    if (!provider && !model) return nothing;

    const parts = [provider, model].filter(Boolean);
    return html`<p class="meta">${parts.join(' / ')}</p>`;
  }

  private renderSystemPrompt() {
    const prompt = this.config.system_prompt;
    if (!prompt) return nothing;

    const display = prompt.length > 100 ? `${prompt.slice(0, 100)}...` : prompt;
    return html`<p class="meta">${display}</p>`;
  }

  render() {
    return html`
      <div class="header">
        <div>
          <h3>${this.config.name}</h3>
          ${this.renderMeta()}
        </div>
      </div>
      ${this.renderSystemPrompt()}
      <div class="actions">
        <button class="btn-info" @click=${() => this.emit('edit')}>Edit</button>
        <button class="btn-secondary" @click=${() => this.emit('clone')}>Clone</button>
        <button class="btn-success" @click=${() => this.emit('execute')}>Execute</button>
        <button class="btn-danger" @click=${() => this.emit('delete')}>Delete</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-card': ConfigCard;
  }
}
```

### File: `web/app/client/config/components/config-list.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: var(--space-4);
}

.empty {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-2);
}
```

### File: `web/app/client/config/components/config-list.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from '@app/router';
import { configServiceContext, type ConfigService } from '../service';
import type { AgentConfig } from '../types';
import '../elements/config-card';
import styles from './config-list.css?inline';

@customElement('gl-config-list')
export class ConfigList extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: configServiceContext })
  private configService!: ConfigService;

  private handleEdit(e: CustomEvent<{ id: string }>) {
    navigate(`config/${e.detail.id}`);
  }

  private handleClone(e: CustomEvent<{ id: string }>) {
    navigate(`config/new?clone=${e.detail.id}`);
  }

  private handleExecute(e: CustomEvent<{ id: string }>) {
    navigate(`execute/${e.detail.id}`);
  }

  private handleDelete(e: CustomEvent<{ id: string }>) {
    if (confirm('Delete this configuration?')) {
      this.configService.delete(e.detail.id);
    }
  }

  private renderEmpty() {
    return html`
      <div class="empty">
        <p>No configurations yet.</p>
        <p><a href="config/new">Create your first configuration</a></p>
      </div>
    `;
  }

  private renderConfigs(configs: AgentConfig[]) {
    return configs.map(
      (config) => html`
        <gl-config-card
          .config=${config}
          @edit=${this.handleEdit}
          @clone=${this.handleClone}
          @execute=${this.handleExecute}
          @delete=${this.handleDelete}
        ></gl-config-card>
      `
    );
  }

  render() {
    const configs = this.configService.configs.get();

    if (configs.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <div class="grid">
        ${this.renderConfigs(configs)}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-list': ConfigList;
  }
}
```

### File: `web/app/client/config/components/config-editor.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: grid;
  grid-template-rows: auto minmax(0, 1fr) auto auto;
  gap: var(--space-4);
}

gl-json-editor {
  min-height: 200px;
}

.validation-error {
  padding: var(--space-2) var(--space-3);
  background: var(--red-bg);
  color: var(--red);
  border-radius: 0.25rem;
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  gap: var(--space-2);
  flex-wrap: wrap;
}

.help {
  font-size: var(--text-sm);
  color: var(--color-2);
}

.help a {
  color: var(--blue);
}
```

### File: `web/app/client/config/components/config-editor.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { configServiceContext, type ConfigService } from '../service';
import { createDefaultConfig, type AgentConfig } from '../types';
import type { JsonChangeEvent } from '@app/shared/elements/json-editor';
import '@app/shared/elements/json-editor';
import styles from './config-editor.css?inline';

/**
 * AgentConfig editor component.
 * Uses generic json-editor element with AgentConfig-specific validation and actions.
 * Emits config-save and config-cancel events for parent views to handle navigation.
 */
@customElement('gl-config-editor')
export class ConfigEditor extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: configServiceContext })
  private configService!: ConfigService;

  /** ID of config to edit (mutually exclusive with cloneId) */
  @property({ type: String }) configId?: string;

  /** ID of config to clone (mutually exclusive with configId) */
  @property({ type: String }) cloneId?: string;

  /** Show Save As button */
  @property({ type: Boolean }) showSaveAs = false;

  /** Show Cancel button */
  @property({ type: Boolean }) showCancel = true;

  @state() private jsonText = '';
  @state() private jsonError: string | null = null;
  @state() private validationError: string | null = null;
  @state() private isDirty = false;
  @state() private currentId: string = '';
  @state() private initialized = false;

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    // Initialize on first update or when configId/cloneId changes
    const shouldInit =
      !this.initialized ||
      changedProperties.has('configId') ||
      changedProperties.has('cloneId');

    if (shouldInit) {
      this.initialized = true;
      this.initializeConfig();
    }
  }

  private initializeConfig() {
    let config: AgentConfig;

    if (this.configId) {
      const existing = this.configService.find(this.configId);
      config = existing ?? createDefaultConfig();
      this.currentId = config.id;
    } else if (this.cloneId) {
      const source = this.configService.find(this.cloneId);
      if (source) {
        config = { ...source, id: crypto.randomUUID(), name: `${source.name} (copy)` };
      } else {
        config = createDefaultConfig();
      }
      this.currentId = config.id;
    } else {
      config = createDefaultConfig();
      this.currentId = config.id;
    }

    const { id, ...display } = config;
    this.jsonText = JSON.stringify(display, null, 2);
    this.isDirty = false;

    // Emit initial config for parent components
    this.updateComplete.then(() => {
      this.dispatchEvent(new CustomEvent('config-change', {
        detail: { config },
        bubbles: true,
        composed: true,
      }));
    });
  }

  private validateConfig(parsed: unknown): AgentConfig | null {
    if (!parsed || typeof parsed !== 'object') {
      this.validationError = 'Config must be a JSON object';
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
      this.validationError = 'Config must have a non-empty "name" field';
      return null;
    }

    this.validationError = null;
    return { id: this.currentId, ...obj } as AgentConfig;
  }

  /** Get the current config if valid, null otherwise */
  get currentConfig(): AgentConfig | null {
    if (this.jsonError) return null;
    try {
      const parsed = JSON.parse(this.jsonText);
      return this.validateConfig(parsed);
    } catch {
      return null;
    }
  }

  private handleJsonChange(e: CustomEvent<JsonChangeEvent>) {
    this.jsonText = e.detail.value;
    this.jsonError = e.detail.error;
    this.validationError = null;
    this.isDirty = true;

    if (e.detail.parsed) {
      const config = this.validateConfig(e.detail.parsed);
      if (config) {
        // Emit config-change for parent components that need the current config
        this.dispatchEvent(new CustomEvent('config-change', {
          detail: { config },
          bubbles: true,
          composed: true,
        }));
      }
    }
  }

  private handleSave() {
    const config = this.currentConfig;
    if (!config) return;

    this.configService.save(config);
    this.isDirty = false;

    this.dispatchEvent(new CustomEvent('config-save', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  private handleSaveAs() {
    const config = this.currentConfig;
    if (!config) return;

    const newName = prompt('Enter name for new configuration:', `${config.name} (copy)`);
    if (!newName) return;

    const newConfig: AgentConfig = {
      ...config,
      id: crypto.randomUUID(),
      name: newName,
    };

    this.configService.save(newConfig);
    this.currentId = newConfig.id;
    this.isDirty = false;

    this.dispatchEvent(new CustomEvent('config-save', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('config-cancel', {
      bubbles: true,
      composed: true,
    }));
  }

  private renderValidationError() {
    if (!this.validationError) return nothing;
    return html`<div class="validation-error">${this.validationError}</div>`;
  }

  private renderSaveAsButton() {
    if (!this.showSaveAs) return nothing;
    return html`
      <button
        class="btn-secondary"
        @click=${this.handleSaveAs}
        ?disabled=${!this.currentConfig}
      >
        Save As...
      </button>
    `;
  }

  private renderCancelButton() {
    if (!this.showCancel) return nothing;
    return html`
      <button class="btn-secondary" @click=${this.handleCancel}>Cancel</button>
    `;
  }

  render() {
    const canSave = this.currentConfig !== null && this.isDirty;

    return html`
      <p class="help">
        Edit the JSON configuration. Only <code>name</code> is required;
        all other fields are optional.
        See <a href="https://github.com/JaimeStill/go-agents" target="_blank">go-agents</a>
        for schema reference.
      </p>

      <gl-json-editor
        .value=${this.jsonText}
        placeholder="Enter agent configuration JSON..."
        @json-change=${this.handleJsonChange}
      ></gl-json-editor>

      ${this.renderValidationError()}

      <div class="actions">
        <button
          class="btn-primary"
          @click=${this.handleSave}
          ?disabled=${!canSave}
        >
          Save
        </button>
        ${this.renderSaveAsButton()}
        ${this.renderCancelButton()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-editor': ConfigEditor;
  }
}
```

### File: `web/app/client/config/views/config-list-view.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
  padding: var(--space-6);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}
```

### File: `web/app/client/config/views/config-list-view.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import {
  configServiceContext,
  createConfigService,
  type ConfigService,
} from '../service';
import '../components/config-list';
import styles from './config-list-view.css?inline';

@customElement('gl-config-list-view')
export class ConfigListView extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @provide({ context: configServiceContext })
  private configService: ConfigService = createConfigService();

  connectedCallback() {
    super.connectedCallback();
    this.configService.list();
  }

  render() {
    return html`
      <div class="header">
        <h1>Configurations</h1>
        <a href="config/new" class="link-btn btn-primary">New Configuration</a>
      </div>
      <gl-config-list></gl-config-list>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-list-view': ConfigListView;
  }
}
```

### File: `web/app/client/config/views/config-edit-view.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  height: 100vh;
}

h1 {
  flex-shrink: 0;
  margin-bottom: var(--space-6);
}

gl-config-editor {
  flex: 1;
  min-height: 0;
}
```

### File: `web/app/client/config/views/config-edit-view.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from '@app/router';
import {
  configServiceContext,
  createConfigService,
  type ConfigService,
} from '../service';
import '../components/config-editor';
import styles from './config-edit-view.css?inline';

@customElement('gl-config-edit-view')
export class ConfigEditView extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @provide({ context: configServiceContext })
  private configService: ConfigService = createConfigService();

  @property({ type: String }) configId?: string;
  @property({ type: String }) clone?: string;

  connectedCallback() {
    super.connectedCallback();
    this.configService.list();
  }

  private get heading(): string {
    if (this.clone) return 'Clone Configuration';
    if (this.configId) return 'Edit Configuration';
    return 'New Configuration';
  }

  private handleSave() {
    navigate('config');
  }

  private handleCancel() {
    navigate('config');
  }

  render() {
    return html`
      <h1>${this.heading}</h1>
      <gl-config-editor
        .configId=${this.configId}
        .cloneId=${this.clone}
        @config-save=${this.handleSave}
        @config-cancel=${this.handleCancel}
      ></gl-config-editor>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-edit-view': ConfigEditView;
  }
}
```

---

## Phase 6: Execution Domain Components

### File: `web/app/client/execution/elements/message-bubble.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
}

.bubble {
  max-width: 80%;
  padding: var(--space-3) var(--space-4);
  border-radius: 0.75rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.user {
  background: var(--blue-bg);
  color: var(--color);
  margin-left: auto;
  border-bottom-right-radius: 0.25rem;
}

.assistant {
  background: var(--bg-2);
  color: var(--color);
  margin-right: auto;
  border-bottom-left-radius: 0.25rem;
}

.streaming {
  border: 1px solid var(--blue);
}
```

### File: `web/app/client/execution/elements/message-bubble.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Message } from '../types';
import styles from './message-bubble.css?inline';

@customElement('gl-message-bubble')
export class MessageBubble extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Object }) message!: Message;
  @property({ type: Boolean }) streaming = false;

  render() {
    return html`
      <div
        class="bubble ${this.message.role} ${this.streaming ? 'streaming' : ''}"
      >
        ${this.message.content}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-message-bubble': MessageBubble;
  }
}
```

### File: `web/app/client/execution/elements/prompt-input.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
}

form {
  display: flex;
  gap: var(--space-2);
}

textarea {
  flex: 1;
  padding: var(--space-3);
  border-radius: 0.5rem;
  resize: none;
  min-height: 2.5rem;
  max-height: 150px;
}

button {
  padding: var(--space-3) var(--space-4);
  border-radius: 0.5rem;
}
```

### File: `web/app/client/execution/elements/prompt-input.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import styles from './prompt-input.css?inline';

@customElement('gl-prompt-input')
export class PromptInput extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) streaming = false;

  @query('textarea') private textarea!: HTMLTextAreaElement;

  private handleSubmit(e: Event) {
    e.preventDefault();
    const value = this.textarea.value.trim();
    if (!value || this.disabled) return;

    this.dispatchEvent(
      new CustomEvent('submit-prompt', {
        detail: { prompt: value },
        bubbles: true,
        composed: true,
      })
    );
    this.textarea.value = '';
  }

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel-stream', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSubmit(e);
    }
  }

  private renderButton() {
    if (this.streaming) {
      return html`
        <button type="button" class="btn-danger" @click=${this.handleCancel}>
          Cancel
        </button>
      `;
    }

    return html`
      <button type="submit" class="btn-primary" ?disabled=${this.disabled}>
        Send
      </button>
    `;
  }

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        <textarea
          placeholder="Type a message..."
          @keydown=${this.handleKeydown}
          ?disabled=${this.disabled || this.streaming}
        ></textarea>
        ${this.renderButton()}
      </form>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-prompt-input': PromptInput;
  }
}
```

### File: `web/app/client/execution/components/message-list.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  overflow-y: auto;
}

.streaming-bubble {
  max-width: 80%;
  padding: var(--space-3) var(--space-4);
  border-radius: 0.75rem;
  background: var(--bg-2);
  border: 1px solid var(--blue);
  white-space: pre-wrap;
  word-break: break-word;
  margin-right: auto;
}

.empty {
  text-align: center;
  color: var(--color-2);
  padding: var(--space-8);
}
```

### File: `web/app/client/execution/components/message-list.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, type ExecutionService } from '../service';
import type { Message } from '../types';
import '../elements/message-bubble';
import styles from './message-list.css?inline';

@customElement('gl-message-list')
export class MessageList extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: executionServiceContext })
  private executionService!: ExecutionService;

  private renderEmpty() {
    return html`
      <div class="empty">Start a conversation by sending a message.</div>
    `;
  }

  private renderMessages(messages: Message[]) {
    return messages.map(
      (msg) => html`<gl-message-bubble .message=${msg}></gl-message-bubble>`
    );
  }

  private renderStreamingBubble() {
    const streaming = this.executionService.streaming.get();
    const current = this.executionService.currentResponse.get();

    if (!streaming || !current) return nothing;

    return html`<div class="streaming-bubble">${current}</div>`;
  }

  render() {
    const messages = this.executionService.messages.get();
    const streaming = this.executionService.streaming.get();

    if (messages.length === 0 && !streaming) {
      return this.renderEmpty();
    }

    return html`
      ${this.renderMessages(messages)}
      ${this.renderStreamingBubble()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-message-list': MessageList;
  }
}
```

### File: `web/app/client/execution/components/config-selector.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
}

select {
  width: 100%;
}

.empty {
  padding: var(--space-2);
  color: var(--color-2);
  text-align: center;
}
```

### File: `web/app/client/execution/components/config-selector.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { configServiceContext, type ConfigService } from '@app/config';
import type { AgentConfig } from '@app/config/types';
import styles from './config-selector.css?inline';

@customElement('gl-config-selector')
export class ConfigSelector extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: configServiceContext })
  private configService!: ConfigService;

  @property({ type: String }) selectedId?: string;

  private handleChange(e: Event) {
    const select = e.target as HTMLSelectElement;
    this.dispatchEvent(
      new CustomEvent('config-select', {
        detail: { id: select.value },
        bubbles: true,
        composed: true,
      })
    );
  }

  private renderConfigOptions(configs: AgentConfig[]) {
    return configs.map(
      (c) => html`<option value=${c.id}>${this.formatOption(c)}</option>`
    );
  }

  private renderEmpty() {
    return html`
      <div class="empty">
        No configurations. <a href="config/new">Create one</a>
      </div>
    `;
  }

  private formatOption(config: AgentConfig): string {
    const parts = [config.name];
    const provider = config.provider?.name;
    const model = config.model?.name;

    if (provider || model) {
      const meta = [provider, model].filter(Boolean).join('/');
      parts.push(`(${meta})`);
    }

    return parts.join(' ');
  }

  render() {
    const configs = this.configService.configs.get();

    if (configs.length === 0) {
      return this.renderEmpty();
    }

    return html`
      <select @change=${this.handleChange} .value=${this.selectedId ?? ''}>
        <option value="">Select a configuration...</option>
        ${this.renderConfigOptions(configs)}
      </select>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-selector': ConfigSelector;
  }
}
```

### File: `web/app/client/execution/components/chat-panel.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: flex;
  flex-direction: column;
  height: 100%;
}

gl-message-list {
  flex: 1;
  padding: var(--space-4);
  min-height: 0;
}

.input-bar {
  padding: var(--space-4);
  border-top: 1px solid var(--divider);
}

.error {
  padding: var(--space-2) var(--space-4);
  background: var(--red-bg);
  color: var(--red);
  font-size: var(--text-sm);
}

.no-config {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-2);
}
```

### File: `web/app/client/execution/components/chat-panel.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, type ExecutionService } from '../service';
import type { AgentConfig } from '@app/config/types';
import './message-list';
import '../elements/prompt-input';
import styles from './chat-panel.css?inline';

/*
 * Chat panel component.
 * Receives config as prop - parent view handles config selection/editing.
 */
@customElement('gl-chat-panel')
export class ChatPanel extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: executionServiceContext })
  private executionService!: ExecutionService;

  @property({ type: Object }) config?: AgentConfig;

  private handleSubmit(e: CustomEvent<{ prompt: string }>) {
    if (!this.config) return;
    this.executionService.chat(this.config, e.detail.prompt);
  }

  private handleCancel() {
    this.executionService.cancel();
  }

  private renderError() {
    const error = this.executionService.error.get();
    if (!error) return nothing;

    return html`<div class="error">${error}</div>`;
  }

  private renderNoConfig() {
    return html`
      <div class="no-config">
        Select or create a configuration to start chatting.
      </div>
    `;
  }

  render() {
    const streaming = this.executionService.streaming.get();

    if (!this.config) {
      return this.renderNoConfig();
    }

    return html`
      ${this.renderError()}

      <gl-message-list></gl-message-list>

      <div class="input-bar">
        <gl-prompt-input
          ?streaming=${streaming}
          @submit-prompt=${this.handleSubmit}
          @cancel-stream=${this.handleCancel}
        ></gl-prompt-input>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-chat-panel': ChatPanel;
  }
}
```

### File: `web/app/client/execution/views/execute-view.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: grid;
  grid-template-columns: 400px 1fr;
  grid-template-rows: auto 1fr;
  height: 100vh;
  gap: var(--space-4);
  padding: var(--space-6);
}

h1 {
  grid-column: 1 / -1;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  min-height: 0;
  overflow: hidden;
}

.config-select {
  flex-shrink: 0;
}

.config-edit {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  padding: var(--space-4);
}

.config-edit gl-config-editor {
  flex: 1;
  min-height: 0;
}

gl-chat-panel {
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  overflow: hidden;
  min-height: 0;
}

@media (max-width: 900px) {
  :host {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }

  .sidebar {
    max-height: 300px;
  }
}
```

### File: `web/app/client/execution/views/execute-view.ts`

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, createExecutionService, type ExecutionService } from '../service';
import { configServiceContext, createConfigService, type ConfigService } from '@app/config';
import type { AgentConfig } from '@app/config/types';
import '../components/chat-panel';
import '../components/config-selector';
import '@app/config/components/config-editor';
import styles from './execute-view.css?inline';

/*
 * Execute view with config selection, runtime editing, and chat.
 *
 * Flow:
 * 1. User selects a saved config from dropdown
 * 2. Config loads into editor for runtime modifications
 * 3. Chat panel uses activeConfig state (updated on each valid edit)
 * 4. Save As persists modifications as new config
 * 5. Save updates the original config
 */
@customElement('gl-execute-view')
export class ExecuteView extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @provide({ context: configServiceContext })
  private configService: ConfigService = createConfigService();

  @provide({ context: executionServiceContext })
  private executionService: ExecutionService = createExecutionService();

  @property({ type: String }) configId?: string;

  @state() private selectedId?: string;
  @state() private activeConfig?: AgentConfig;

  connectedCallback() {
    super.connectedCallback();
    this.configService.list();

    // Initialize selected config from route param
    if (this.configId) {
      this.selectedId = this.configId;
    }
  }

  private handleConfigSelect(e: CustomEvent<{ id: string }>) {
    this.selectedId = e.detail.id || undefined;
    // Clear active config - will be set by config-editor's config-change event
    if (!e.detail.id) {
      this.activeConfig = undefined;
    }
  }

  private handleConfigChange(e: CustomEvent<{ config: AgentConfig }>) {
    this.activeConfig = e.detail.config;
  }

  private renderConfigEditor() {
    if (!this.selectedId) return nothing;

    return html`
      <gl-config-editor
        .configId=${this.selectedId}
        .showSaveAs=${true}
        .showCancel=${false}
        @config-change=${this.handleConfigChange}
      ></gl-config-editor>
    `;
  }

  render() {
    return html`
      <h1>Execute</h1>

      <div class="sidebar">
        <div class="config-select">
          <gl-config-selector
            .selectedId=${this.selectedId}
            @config-select=${this.handleConfigSelect}
          ></gl-config-selector>
        </div>
        <div class="config-edit">
          ${this.renderConfigEditor()}
        </div>
      </div>

      <gl-chat-panel .config=${this.activeConfig}></gl-chat-panel>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-execute-view': ExecuteView;
  }
}
```

---

## Phase 7: Home View & App Entry

### File: `web/app/client/home/views/home-view.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
  padding: var(--space-6);
}

h1 {
  margin-bottom: var(--space-4);
}

.description {
  color: var(--color-1);
  margin-bottom: var(--space-6);
  max-width: 600px;
}

nav {
  display: flex;
  gap: var(--space-4);
}

nav a {
  padding: var(--space-3) var(--space-6);
  border-radius: 0.5rem;
}
```

### File: `web/app/client/home/views/home-view.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './home-view.css?inline';

@customElement('gl-home-view')
export class HomeView extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    return html`
      <h1>Go-Lit</h1>
      <p class="description">
        A Go + Lit architecture proof of concept demonstrating clean separation
        between server (data/routing) and client (presentation/state
        management).
      </p>
      <nav>
        <a href="config" class="link-btn btn-primary">Manage Configurations</a>
        <a href="execute" class="link-btn btn-secondary">Execute Chat</a>
      </nav>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-home-view': HomeView;
  }
}
```

### File: `web/app/client/home/views/not-found-view.css`

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
  padding: var(--space-6);
  text-align: center;
}

h1 {
  margin-bottom: var(--space-4);
  color: var(--red);
}

.path {
  font-family: var(--font-mono);
  background: var(--bg-2);
  padding: var(--space-1) var(--space-2);
  border-radius: 0.25rem;
}

p {
  margin-bottom: var(--space-6);
  color: var(--color-1);
}
```

### File: `web/app/client/home/views/not-found-view.ts`

```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './not-found-view.css?inline';

@customElement('gl-not-found-view')
export class NotFoundView extends LitElement {
  static styles = unsafeCSS(styles);

  @property() path?: string;

  render() {
    return html`
      <h1>Page Not Found</h1>
      <p>
        The path <span class="path">${this.path ?? 'unknown'}</span> doesn't
        exist.
      </p>
      <a href="" class="link-btn btn-primary">Return Home</a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-not-found-view': NotFoundView;
  }
}
```

### File: `web/app/client/app.ts` (replace entire file)

```typescript
import './design/styles.css';

import { Router } from '@app/router';

import './home/views/home-view';
import './home/views/not-found-view';
import './config/views/config-list-view';
import './config/views/config-edit-view';
import './execution/views/execute-view';

const router = new Router('app-content');
router.start();
```

---

## Phase 8: Server Updates

### File: `web/app/app.go`

Find and replace the `views` variable:

**Before:**
```go
var views = []web.ViewDef{
	{Route: "/{$}", Template: "home.html", Title: "Home", Bundle: "app"},
}
```

**After:**
```go
var views = []web.ViewDef{
	{Route: "/{path...}", Template: "shell.html", Title: "Go Lit", Bundle: "app"},
}
```

### File: `web/app/server/views/shell.html` (rename from `home.html`)

Rename `web/app/server/views/home.html` to `web/app/server/views/shell.html` and replace contents:

```html
{{ define "content" }}
<!-- Client router mounts view components here -->
{{ end }}
```

---

## Verification Steps

After implementation, run these commands:

```bash
# Build web assets
cd web && bun run build

# Start server
go run ./cmd/server
```

Then verify:

**Navigation:**
1. Navigate to `http://localhost:8080/app/` - home view should render
2. Navigate to `http://localhost:8080/app/config` - config list should render (empty initially)
3. Use browser back/forward - should navigate correctly
4. Refresh on any route - should render correct view

**Config Management:**
5. Click "New Configuration" - JSON editor should render with default template
6. Edit JSON and save - should persist to localStorage
7. Return to config list - new config should appear
8. Click "Edit" on a config - should load config in editor
9. Click "Clone" on a config - should navigate to new config with (copy) name
10. Click "Delete" on a config - should remove from list

**Execution:**
11. Click "Execute" on a config - should navigate to execute view with config selected
12. Config selector should show available configs
13. Config editor should load selected config
14. Edit JSON in execute view - changes reflect without saving (runtime only)
15. Click "Save As" to persist runtime changes as new config
16. Send a message - should stream response (requires go-agents server)
17. Cancel stream - should abort correctly
