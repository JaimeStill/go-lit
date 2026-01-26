import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js'
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

    return html`<p class="system-prompt">${prompt}</p>`;
  }

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
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-card': ConfigCard;
  }
}
