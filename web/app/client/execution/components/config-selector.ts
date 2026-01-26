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
    return configs.map((c) => html`
      <option
        value=${c.id}
        ?selected=${c.id === this.selectedId}>
        ${this.formatOption(c)}
      </option>
    `)
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
      <select @change=${this.handleChange}>
        <option value="" ?selected=${!this.selectedId}>Select a configuration...</option>
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
