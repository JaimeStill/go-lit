# Native CSS Module Imports

## Desired Pattern

When Vite adds native support for CSS module imports with import attributes, refactor to this pattern:

### Type Declaration

**File:** `web/app/client/css.d.ts`

```typescript
declare module '*.css' {
  const styles: CSSStyleSheet;
  export default styles;
}
```

### Component Usage

```typescript
import { LitElement, html } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './component.css' with { type: 'css' };

@customElement('gl-component')
export class Component extends LitElement {
  static styles = styles;

  render() {
    return html`<div>Content</div>`;
  }
}
```

## Benefits

1. **Standards-aligned**: Uses the [Import Attributes](https://github.com/tc39/proposal-import-attributes) proposal (Stage 4)
2. **Type-safe**: Returns `CSSStyleSheet` directly, compatible with Lit's `static styles`
3. **No wrapper needed**: Eliminates `unsafeCSS()` call
4. **Cleaner syntax**: More explicit about import intent

## Current Limitation

As of January 2026, Vite does not natively support the `with { type: 'css' }` import syntax. The build fails with:

```
"default" is not exported by "component.css", imported by "component.ts"
```

### Workaround Considered

The `vite-plugin-standard-css-modules` plugin exists but was rejected due to:
- Last updated 2+ years ago
- Uncertain maintenance status
- Prefer native support over plugin dependency

## Current Implementation

Using Vite's `?inline` query parameter:

**Type Declaration:**
```typescript
declare module '*.css?inline' {
  const styles: string;
  export default styles;
}
```

**Component Usage:**
```typescript
import { LitElement, html, unsafeCSS } from 'lit';
import styles from './component.css?inline';

@customElement('gl-component')
export class Component extends LitElement {
  static styles = unsafeCSS(styles);
}
```

## Migration Path

When Vite adds native CSS module support:

1. Update `css.d.ts` to declare `CSSStyleSheet` return type
2. Remove `?inline` suffix from all CSS imports
3. Add `with { type: 'css' }` to imports
4. Remove `unsafeCSS()` wrapper from `static styles`
5. Remove `unsafeCSS` from lit imports

## Tracking

- Vite issue: https://github.com/vitejs/vite/issues/17700
- TC39 Import Attributes: https://github.com/tc39/proposal-import-attributes
