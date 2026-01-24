import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { navigate } from '@app/router';
import { configServiceContext, createConfigService, type ConfigService } from '../service';
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
