import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import styles from './prompt-input.css?inline';

@customElement('gl-prompt-input')
export class PromptInput extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) streaming = false;

  @query('textarea') private textarea!: HTMLTextAreaElement;

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
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-prompt-input': PromptInput;
  }
}
