import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import styles from './json-editor.css?inline';

export interface JsonChangeEvent {
  value: string;
  parsed: unknown | null;
  error: string | null;
}

/*
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
    return html`<div class="error">${this.parseError}</div>`
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
