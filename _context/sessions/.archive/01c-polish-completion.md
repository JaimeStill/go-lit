# Session 01c: Polish & Completion

## Problem Context

Session 3 completes the go-lit POC with:
- App header with persistent navigation
- Config selector auto-selection fix
- Config card grid alignment
- Vision execution support
- Final layout review

## Architecture Approach

### App Header
Add header to app.html layout template - it's app shell infrastructure alongside head, scripts, styles. Router keeps targeting `app-content`.

### Design Directory Restructure
Reorganize for clarity:
- `core/` - design system foundation (tokens, reset, theme, layout)
- `app/` - application-specific infrastructure (app.css for shell, elements.css for Shadow DOM)
- `index.css` - entry point (renamed from styles.css)

### Config Selector
Use `?selected` attribute on options instead of `.value` binding on select to handle async config loading.

### Config Card Layout
Self-contained card with internal CSS grid (`auto 1fr auto`). Card fills parent height; actions anchor to bottom. No coupling to parent container structure.

### Vision Support
Extend `prompt-input` with optional image attachment. `chat-panel` derives vision capability from config and passes to prompt-input.

---

## Phase 1: App Header with Navigation

The header is app shell infrastructure. It belongs in the layout template (`app.html`) alongside other shell elements (head, scripts, styles).

This phase also restructures the design directory for clarity:
- `core/` - design system foundation (tokens, reset, theme, layout)
- `app/` - application-specific infrastructure (shell styles, element styles)

### Step 1.1: Restructure design directory

Create new directory structure and move files:

```bash
cd web/app/client/design

# Create new directories
mkdir -p core app

# Move core design system files
mv tokens.css core/
mv reset.css core/
mv theme.css core/
mv layout.css core/

# Move elements.css to app/
mv components/elements.css app/

# Remove old components directory
rmdir components

# Rename entry point
mv styles.css index.css
```

### Step 1.2: Create app/app.css

**File:** `web/app/client/design/app/app.css` (new)

This establishes the app-shell scroll model:
- Body fills exactly the viewport, never scrolls
- Views fill available space via flex
- Each view manages its own internal scroll regions

```css
body {
  display: flex;
  flex-direction: column;
  height: 100dvh;
  margin: 0;
  overflow: hidden;
}

.app-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-3) var(--space-6);
  background: var(--bg-1);
  border-bottom: 1px solid var(--divider);
}

.app-header .brand {
  font-size: var(--text-lg);
  font-weight: 600;
  color: var(--color);
  text-decoration: none;
}

.app-header .brand:hover {
  color: var(--blue);
}

.app-header nav {
  display: flex;
  gap: var(--space-4);
}

.app-header nav a {
  color: var(--color-1);
  text-decoration: none;
  font-size: var(--text-sm);
}

.app-header nav a:hover {
  color: var(--blue);
}

#app-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

#app-content > * {
  flex: 1;
  min-height: 0;
}
```

**Scroll architecture principles:**
- `height: 100dvh` + `overflow: hidden` on body = fixed viewport
- `flex: 1` + `min-height: 0` on containers = fill space, allow shrinking
- `overflow-y: auto` on leaf containers = create scroll regions
- Every ancestor in the chain needs constrained height for overflow to work
- **Avoid `height: 100%`** in flex/grid contexts - it requires explicit parent height. Use `flex: 1` instead.

### Step 1.2a: Update view and component CSS for scroll architecture

Views and components need proper flex/grid setup for the app-shell scroll model. Remove `height: 100%` / `height: 100vh` - use `flex: 1` + `min-height: 0` instead.

**`config/views/config-edit-view.css`** - remove `height: 100vh`:
```css
:host {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
}
```

**`execution/views/execute-view.css`** - remove `height: 100vh`, add chat panel flex setup:
```css
:host {
  display: grid;
  grid-template-columns: 400px 1fr;
  grid-template-rows: auto 1fr;
  gap: var(--space-4);
  padding: var(--space-6);
}

/* ... existing styles ... */

gl-chat-panel {
  align-self: stretch;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  overflow: hidden;
  min-height: 0;
}
```

**`execution/components/chat-panel.css`** - remove `height: 100%`:
```css
:host {
  display: flex;
  flex-direction: column;
}
```

**`config/views/config-list-view.css`** - add scroll support for many configs:
```css
:host {
  display: flex;
  flex-direction: column;
  padding: var(--space-6);
  overflow: hidden;
}

.header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-6);
}

gl-config-list {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}
```

### Step 1.3: Update index.css

**File:** `web/app/client/design/index.css`

Update imports to reflect new structure:

```css
@import './core/tokens.css';
@import './core/reset.css';
@import './core/theme.css';
@import './core/layout.css';
@import './app/app.css';
```

### Step 1.4: Update component CSS imports

Update all component CSS files that import elements.css. Change:
```css
@import '@app/design/components/elements.css';
```
To:
```css
@import '@app/design/app/elements.css';
```

Files to update:
- `config/elements/config-card.css`
- `config/components/config-list.css`
- `config/components/config-editor.css`
- `execution/elements/prompt-input.css`
- `execution/elements/message-bubble.css`
- `execution/components/config-selector.css`
- `execution/components/chat-panel.css`
- `execution/components/message-list.css`
- `execution/views/execute-view.css`
- `config/views/config-list-view.css`
- `config/views/config-edit-view.css`
- `home/views/home-view.css`
- `home/views/not-found-view.css`

### Step 1.5: Update app.ts import

**File:** `web/app/client/app.ts`

Update the CSS import:

```typescript
import './design/index.css';
```

### Step 1.6: Update app.html

**File:** `web/app/server/layouts/app.html`

Add header before main element:

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
  <header class="app-header">
    <a href="" class="brand">Go + Lit</a>
    <nav>
      <a href="config">Configurations</a>
      <a href="execute">Execute</a>
    </nav>
  </header>
  <main id="app-content">
    {{ block "content" . }}{{ end }}
  </main>
  <script type="module" src="dist/{{ .Bundle }}.js"></script>
</body>
</html>
```

### Verification 1
- `make dev`
- Navigate to `/app/` - header visible with brand and nav links
- Click nav links - content changes, header persists
- Browser back/forward - header persists

---

## Phase 2: Config Selector Auto-Selection

### Step 2.1: Update config-selector.ts

**File:** `web/app/client/execution/components/config-selector.ts`

Update `renderConfigOptions` method (around line 29):

```typescript
private renderConfigOptions(configs: AgentConfig[]) {
  return configs.map((c) => html`
    <option value=${c.id} ?selected=${c.id === this.selectedId}>${this.formatOption(c)}</option>
  `)
}
```

Update `render` method - remove `.value` binding, add `?selected` to default option (around line 56):

```typescript
render() {
  const configs = this.configService.configs.get();

  if (configs.length === 0) {
    return this.renderEmpty();
  }

  return html`
    <select @change=${this.handleChange}>
      <option value="" ?selected=${!this.selectedId}>Select a configuration...</option>
      ${this.renderConfigOptions(configs)}
    </select>
  `;
}
```

### Verification 2
- Create a config, note its ID in URL
- Navigate directly to `/app/execute/{id}`
- Select should show correct config selected
- Change selection - works normally

---

## Phase 3: Config Card Grid Layout

### Step 3.1: Update config-card.css

**File:** `web/app/client/config/elements/config-card.css`

Replace entire file:

```css
@import '@app/design/app/elements.css';

:host {
  display: grid;
  grid-template-rows: auto 1fr auto;
  background: var(--bg-1);
  border: 1px solid var(--divider);
  border-radius: 0.5rem;
  padding: var(--space-4);
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.content {
  overflow: hidden;
}

.meta {
  color: var(--color-2);
  font-size: var(--text-sm);
}

.system-prompt {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  overflow: hidden;
  line-height: 1.4;
  color: var(--color-2);
  font-size: var(--text-sm);
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  margin-top: var(--space-4);
}
```

### Step 3.2: Update config-card.ts

**File:** `web/app/client/config/elements/config-card.ts`

Update `renderSystemPrompt` method - remove JS truncation, add class:

```typescript
private renderSystemPrompt() {
  const prompt = this.config.system_prompt;
  if (!prompt) return nothing;

  return html`<p class="system-prompt">${prompt}</p>`;
}
```

Update `render` method - wrap system prompt in content div:

```typescript
render() {
  return html`
    <div class="header">
      <div>
        <h3>${this.config.name}</h3>
        ${this.renderMeta()}
      </div>
    </div>
    <div class="content">
      ${this.renderSystemPrompt()}
    </div>
    <div class="actions">
      <button class="btn-info" @click=${() => this.emit('edit')}>
        Edit
      </button>
      <button class="btn-secondary" @click=${() => this.emit('clone')}>
        Clone
      </button>
      <button class="btn-success" @click=${() => this.emit('execute')}>
        Execute
      </button>
      <button class="btn-danger" @click=${() => this.emit('delete')}>
        Delete
      </button>
    </div>
  `;
}
```

### Step 3.3: Update config-list.css minimum card width

**File:** `web/app/client/config/components/config-list.css`

Change the minimum card width from 300px to 340px to accommodate all 4 action buttons on a single line:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: var(--space-4);
}
```

### Verification 3
- Create configs with varying system_prompt lengths
- Cards in same row have equal heights
- Action buttons align at bottom across all cards
- All 4 action buttons fit on a single line
- Long prompts truncated with ellipsis

---

## Phase 4: Vision Execution Support

### Step 4.1: Update prompt-input.css

**File:** `web/app/client/execution/elements/prompt-input.css`

Replace entire file:

```css
@import '@app/design/components/elements.css';

:host {
  display: block;
}

form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.input-row {
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

.image-section {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--space-2);
}

.attach-btn {
  padding: var(--space-2) var(--space-3);
  font-size: var(--text-sm);
}

.image-previews {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.image-preview {
  position: relative;
  width: 60px;
  height: 60px;
}

.image-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 0.25rem;
  border: 1px solid var(--divider);
}

.remove-btn {
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  padding: 0;
  font-size: 12px;
  line-height: 1;
  border-radius: 50%;
  background: var(--red);
  color: var(--bg);
  border: none;
  cursor: pointer;
}
```

### Step 4.2: Update prompt-input.ts

**File:** `web/app/client/execution/elements/prompt-input.ts`

Replace entire file:

```typescript
import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import styles from './prompt-input.css?inline';

@customElement('gl-prompt-input')
export class PromptInput extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) streaming = false;
  @property({ type: Boolean }) enableVision = false;

  @state() private selectedImages: File[] = [];

  private imageUrls = new Map<File, string>();

  @query('textarea') private textarea!: HTMLTextAreaElement;
  @query('input[type="file"]') private fileInput!: HTMLInputElement;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.revokeAllUrls();
  }

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        ${this.renderImageSection()}
        <div class="input-row">
          <textarea
            placeholder="Type a message..."
            @keydown=${this.handleKeydown}
            ?disabled=${this.disabled || this.streaming}
          ></textarea>
        </div>
        ${this.renderButton()}
      </form>
    `;
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

  private renderImagePreviews() {
    if (this.selectedImages.length < 1)
      return nothing;

    return html`
      <div class="image-previews">
        ${this.selectedImages.map((file, index) => html`
          <div class="image-preview">
            <img src=${this.getImageUrl(file)} alt=${file.name}>
            <button
              type="button"
              class="remove-btn"
              @click=${() => this.removeImage(index)}
            >x</button>
          </div>
        `)}
      </div>
    `;
  }

  private renderImageSection() {
    if (!this.enableVision)
      return nothing;

    return html`
      <div class="image-section">
        <input
          type="file"
          accept="image/*"
          multiple
          @change=${this.handleFileSelect}
          ?disabled=${this.disabled || this.streaming}
          hidden
        >
        <button
          type="button"
          class="btn-secondary attach-btn"
          @click=${this.triggerFileInput}
          ?disabled=${this.disabled || this.streaming}
        >
          Attach Images
        </button>
        ${this.renderImagePreviews()}
      </div>
    `;
  }

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel-stream', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.selectedImages = [...this.selectedImages, ...Array.from(input.files)];
      input.value = '';
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSubmit(e);
    }
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    const value = this.textarea.value.trim();
    if (!value || this.disabled) return;

    if (this.selectedImages.length > 0) {
      this.dispatchEvent(
        new CustomEvent('submit-vision', {
          detail: { prompt: value, images: this.selectedImages },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('submit-prompt', {
          detail: { prompt: value },
          bubbles: true,
          composed: true,
        })
      );
    }
    this.textarea.value = '';
    this.clearImages();
  }

  private removeImage(index: number) {
    const file = this.selectedImages[index];
    this.revokeImageUrl(file);
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
  }

  private triggerFileInput() {
    this.fileInput.click();
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

  private clearImages() {
    this.revokeAllUrls();
    this.selectedImages = [];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-prompt-input': PromptInput;
  }
}
```

### Step 4.3: Update chat-panel.ts

**File:** `web/app/client/execution/components/chat-panel.ts`

Add vision capability getter after the `config` property:

```typescript
private get supportsVision(): boolean {
  return !!this.config?.model?.capabilities?.vision;
}
```

Add vision submit handler after `handleSubmit`:

```typescript
private handleVisionSubmit(e: CustomEvent<{ prompt: string; images: File[] }>) {
  if (!this.config) return;
  this.executionService.vision(this.config, e.detail.prompt, e.detail.images);
}
```

Update the `gl-prompt-input` in render method:

```typescript
<gl-prompt-input
  ?streaming=${streaming}
  ?enableVision=${this.supportsVision}
  @submit-prompt=${this.handleSubmit}
  @submit-vision=${this.handleVisionSubmit}
  @cancel-stream=${this.handleCancel}
></gl-prompt-input>
```

### Verification 4
- Select config WITHOUT vision capability - no "Attach Images" button
- Select config WITH vision capability - "Attach Images" button visible
- Can select multiple images, thumbnails appear
- Can remove images with x button
- Submit with images calls vision endpoint
- Submit without images calls chat endpoint

---

## Phase 5: Final Layout Review

### Step 5.1: Update home-view.ts

**File:** `web/app/client/home/views/home-view.ts`

Update render method - remove nav element:

```typescript
render() {
  return html`
    <h1>Go + Lit</h1>
    <p class="description">
      A Go + Lit architecture proof of concept demonstrating clean separation
      between server (data/routing) and client (presentation/state/management).
    </p>
  `;
}
```

### Step 5.2: Increase config card minimum width

**File:** `web/app/client/config/components/config-list.css`

Increase minimum card width from 340px to 380px to ensure all 4 action buttons fit on a single line at all container widths:

```css
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: var(--space-4);
}
```

### Step 5.3: Reorder config editor layout

**File:** `web/app/client/config/components/config-editor.css`

Update grid template to reflect new element order (help → actions → validation → editor):

```css
:host {
  display: grid;
  grid-template-rows: auto auto auto minmax(0, 1fr);
  gap: var(--space-4);
}
```

**File:** `web/app/client/config/components/config-editor.ts`

Update render method to reorder elements:

```typescript
render() {
  const canSave = this.currentConfig !== null && this.isDirty;

  return html`
    <p class="help">
      Edit the JSON configuration. Only <code>name</code> is required;
      all other fields are optional.
      See <a href="https://github.com/JaimeStill/go-agents" target="_blank">go-agents</a>
      for schema reference.
    </p>

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

    ${this.renderValidationError()}

    <gl-json-editor
      .value=${this.jsonText}
      placeholder="Enter agent configuration JSON..."
      @json-change=${this.handleJsonChange}
    ></gl-json-editor>
  `;
}
```

### Step 5.4: Fix JSON editor stretching in wide view

The JSON editor should fill available space within the config-edit container. The height chain must be intact from container to textarea.

**File:** `web/app/client/execution/views/execute-view.css`

Ensure the config-edit container passes height to config-editor:

```css
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
```

**File:** `web/app/client/config/components/config-editor.css`

Use explicit grid placement for the editor so it always uses row 4, even when validation error isn't rendered:

```css
gl-json-editor {
  grid-row: 4;
}
```

Remove the `min-height: 200px` - it prevents proper stretching.

### Step 5.5: Add responsive expand/collapse for config editor

In responsive view, the config-edit section should be collapsible. When collapsed, only the selector is visible. When expanded, the config editor gets equal space with the chat panel.

**File:** `web/app/client/execution/views/execute-view.ts`

Add state, toggle handler, and reflect state to host attribute:

```typescript
@state() private editorExpanded = false;

updated(changed: Map<string, unknown>) {
  if (changed.has('editorExpanded')) {
    this.toggleAttribute('editor-expanded', this.editorExpanded);
  }
}

private toggleEditor() {
  this.editorExpanded = !this.editorExpanded;
}
```

Update the sidebar render to include a toggle button:

```typescript
render() {
  return html`
    <h1>Execute</h1>

    <div class="sidebar">
      <div class="config-select">
        <gl-config-selector
          .selectedId=${this.selectedId}
          @config-select=${this.handleConfigSelect}
        ></gl-config-selector>
        <button
          class="expand-toggle btn-secondary"
          @click=${this.toggleEditor}
          ?hidden=${!this.selectedId}
        >
          ${this.editorExpanded ? 'Hide Editor' : 'Show Editor'}
        </button>
      </div>
      <div class="config-edit ${this.editorExpanded ? 'expanded' : ''}">
        ${this.renderConfigEditor()}
      </div>
    </div>

    <gl-chat-panel .config=${this.activeConfig}></gl-chat-panel>
  `;
}
```

**File:** `web/app/client/execution/views/execute-view.css`

Add styles for the toggle button and collapsed/expanded states. Use host attribute to change grid layout:

```css
/* Toggle button - hidden in wide view */
.expand-toggle {
  display: none;
}

/* Responsive layout */
@media (max-width: 900px) {
  :host {
    grid-template-columns: 1fr;
    grid-template-rows: auto auto 1fr;
  }

  /* When editor expanded, split space equally between sidebar and chat */
  :host([editor-expanded]) {
    grid-template-rows: auto 1fr 1fr;
  }

  .config-select {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .config-select select {
    flex: 1;
  }

  .expand-toggle {
    display: block;
    flex-shrink: 0;
  }

  /* Collapsed state - hide config-edit content */
  .config-edit {
    display: none;
  }

  /* Expanded state - show config-edit, fill sidebar space */
  .config-edit.expanded {
    display: flex;
    min-height: 0;
  }
}
```

### Step 5.6: Auto-scroll chat during streaming

When streaming a response, automatically scroll the message list to keep the latest content visible.

**File:** `web/app/client/execution/components/message-list.ts`

Add `updated()` lifecycle to scroll to bottom when streaming:

```typescript
updated() {
  if (this.executionService.streaming.get()) {
    this.scrollToBottom();
  }
}

private scrollToBottom() {
  this.scrollTop = this.scrollHeight;
}
```

Since `:host` is the scroll container (`overflow-y: auto`), we can use `this.scrollTop` and `this.scrollHeight` directly on the element.

### Step 5.7: Review Checklist

- [ ] Header visible and functional on all routes
- [ ] Config selector auto-selects from route param
- [ ] Config cards have consistent heights, all 4 buttons on single line
- [ ] Config editor actions appear above the editor
- [ ] JSON editor fills available space in wide view
- [ ] Responsive view: toggle shows/hides editor, collapsed shows only selector
- [ ] Vision UI appears only for vision-capable configs
- [ ] Chat auto-scrolls during streaming
- [ ] Execute view layout balanced
- [ ] No visual regressions

---

## Full Session Verification

```bash
go vet ./...
make dev
```

Manual testing:
1. Navigate through all routes via header
2. Create/edit/delete configs
3. Execute chat with text-only config
4. Execute vision with vision-capable config
5. Browser back/forward navigation
6. Direct URL navigation to `/app/execute/{id}`
