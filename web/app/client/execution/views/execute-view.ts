import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { provide } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, createExecutionService, type ExecutionService } from '../service';
import { configServiceContext, createConfigService, type ConfigService } from '@app/config';
import type { AgentConfig } from '@app/config/types';
import '../components/chat-panel';
import '../components/config-selector';
import '@app/config/components/config-editor';
import styles from './execute-view.css?inline';

/*
 * Execute view with config selection, runtime editing, and chat.
 *
 * Flow:
 * 1. User selects a saved config from dropdown
 * 2. Config loads into editor for runtime modifications
 * 3. Chat panel uses activeConfig state (updated on each valid edit)
 * 4. Save As persists modifications as new config
 * 5. Save updates the original config
 */
@customElement('gl-execute-view')
export class ExecuteView extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @provide({ context: configServiceContext })
  private configService: ConfigService = createConfigService();

  @provide({ context: executionServiceContext })
  private executionService: ExecutionService = createExecutionService();

  @property({ type: String }) configId?: string;

  @state() private selectedId?: string;
  @state() private activeConfig?: AgentConfig;
  @state() private editorExpanded = false;

  connectedCallback() {
    super.connectedCallback();
    this.configService.list();

    // Initialize selected config from route param
    if (this.configId) {
      this.selectedId = this.configId;
    }
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('editorExpanded')) {
      this.toggleAttribute('editor-expanded', this.editorExpanded);
    }
  }

  private handleConfigSelect(e: CustomEvent<{ id: string }>) {
    this.selectedId = e.detail.id || undefined;
    // Clear active config - will be set by config-editor's config-change event
    if (!e.detail.id)
      this.activeConfig = undefined;
  }

  private handleConfigChange(e: CustomEvent<{ config: AgentConfig }>) {
    this.activeConfig = e.detail.config;
  }

  private renderConfigEditor() {
    if (!this.selectedId) return nothing;

    return html`
      <gl-config-editor
        .configId=${this.selectedId}
        .showSaveAs=${true}
        .showCancel=${false}
        @config-change=${this.handleConfigChange}
      ></gl-config-editor>
    `;
  }

  private toggleEditor() {
    this.editorExpanded = !this.editorExpanded;
  }

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
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-execute-view': ExecuteView;
  }
}
