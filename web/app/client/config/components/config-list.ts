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
    return configs.map((config) => html`
      <gl-config-card
        .config=${config}
        @edit=${this.handleEdit}
        @clone=${this.handleClone}
        @execute=${this.handleExecute}
        @delete=${this.handleDelete}
      ></gl-config-card>
    `)
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
