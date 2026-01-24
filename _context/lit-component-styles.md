# Lit Component Styles Convention

## Rule: Define component styles in external CSS files

All Lit component styles should be defined in co-located `.css` files rather than inline `css` tagged template literals.

## Why External CSS Files

### 1. Full LSP Support

External `.css` files receive complete language server support:
- **Autocomplete** for properties, values, and CSS variables
- **Hover documentation** for property descriptions
- **Diagnostics** for syntax errors and invalid values
- **Go to definition** for CSS variables

Inline `css` template literals only receive basic validation from `ts-lit-plugin` - no autocomplete or intellisense.

### 2. Editor Agnostic

External CSS files work identically across all editors (Neovim, VS Code, etc.) without requiring editor-specific plugins or configurations.

### 3. Separation of Concerns

Keeps TypeScript files focused on component logic and structure. Style definitions live alongside components but in dedicated files optimized for CSS authoring.

### 4. Easier Refactoring

CSS-specific tooling (linting, formatting, analysis) works naturally on `.css` files without needing to parse them out of TypeScript.

## Implementation Pattern

### File Structure

```
components/
├── my-component.ts
└── my-component.css
```

### CSS File

```css
/* my-component.css */
:host {
  display: block;
  background: var(--bg-1);
}

.header {
  display: flex;
  gap: var(--space-2);
}
```

### Component File

```typescript
// my-component.ts
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './my-component.css' with { type: 'css' };

@customElement('my-component')
export class MyComponent extends LitElement {
  static styles = styles;

  render() {
    return html`<div class="header">...</div>`;
  }
}
```

## Import Syntax

Use the CSS module import with assertion:

```typescript
import styles from './my-component.css' with { type: 'css' };
```

This imports the CSS as a `CSSStyleSheet` object that Lit's `static styles` accepts directly.

## Build Configuration

Ensure your bundler supports CSS module imports. For Vite (used in this project), this works out of the box.

## When Inline Styles Are Acceptable

- **Trivial styles**: Single property like `:host { display: block; }`
- **Dynamic styles**: Styles that depend on component state (use `styleMap` directive)
- **Prototype/exploration**: Quick iteration before extracting to external file

Even in these cases, prefer external files for consistency once the component stabilizes.

## Migration

When converting existing inline styles:

1. Create `component-name.css` alongside the component
2. Move CSS content from the template literal to the file
3. Replace `static styles = css\`...\`` with the import pattern
4. Verify styles render correctly
