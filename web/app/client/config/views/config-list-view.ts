import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { configServiceContext, createConfigService, type ConfigService } from '../service';
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
