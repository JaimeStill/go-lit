import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { configServiceContext, type ConfigService } from '../service';
import { createDefaultConfig, type AgentConfig } from '../types';
import type { JsonChangeEvent } from '@app/shared/elements/json-editor';
import '@app/shared/elements/json-editor';
import styles from './config-editor.css?inline';

/*
 * AgentConfig editor component.
 * Uses generic json-editor element with AgentConfig-specific validation and actions.
 * Emits config-save and config-cancel events for parent views to handle navigation.
 */
@customElement('gl-config-editor')
export class ConfigEditor extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: configServiceContext })
  private configService!: ConfigService;

  @property({ type: String }) configId?: string;

  @property({ type: String }) cloneId?: string;

  @property({ type: Boolean }) showSaveAs = false;

  @property({ type: Boolean }) showCancel = true;

  @state() private jsonText = '';
  @state() private jsonError: string | null = null;
  @state() private validationError: string | null = null;
  @state() private isDirty = false;
  @state() private currentId: string = '';
  @state() private initialized = false;

  updated(changedProperties: Map<string, unknown>) {
    super.updated(changedProperties);

    const shouldInit =
      !this.initialized
      || changedProperties.has('configId')
      || changedProperties.has('cloneId');

    if (shouldInit) {
      this.initialized = true;
      this.initializeConfig();
    }
  }

  render() {
    const canSave = this.currentConfig !== null && this.isDirty;

    return html`
      <p class="help">
        Edit the JSON configuration. Only <code>name</code> is required;
        all other fields are optional.
        See <a href="https://github.com/JaimeStill/go-agents" target="_blank">go-agents</a>
        for schema reference.
      </p>

      <gl-json-editor
        .value=${this.jsonText}
        placeholder="Enter agent configuration JSON..."
        @json-change=${this.handleJsonChange}
      ></gl-json-editor>

      ${this.renderValidationError()}

      <div class="actions">
        <button
          class="btn-primary"
          @click=${this.handleSave}
          ?disabled=${!canSave}
        >
          Save
        </button>
        ${this.renderSaveAsButton()}
        ${this.renderCancelButton()}
      </div>
    `;
  }

  private renderCancelButton() {
    if (!this.showCancel) return nothing;
    return html`
      <button class="btn-secondary" @click=${this.handleCancel}>Cancel</button>
    `;
  }

  private renderSaveAsButton() {
    if (!this.showSaveAs) return nothing;
    return html`
      <button
        class="btn-secondary"
        @click=${this.handleSaveAs}
        ?disabled=${!this.currentConfig}
      >
        Save As...
      </button>
    `;
  }

  private renderValidationError() {
    if (!this.validationError) return nothing;
    return html`<div class="validation-error">${this.validationError}</div>`
  }

  private handleCancel() {
    this.dispatchEvent(new CustomEvent('config-cancel', {
      bubbles: true,
      composed: true,
    }));
  }

  private handleJsonChange(e: CustomEvent<JsonChangeEvent>) {
    this.jsonText = e.detail.value;
    this.jsonError = e.detail.error;
    this.validationError = null;
    this.isDirty = true;

    if (e.detail.parsed) {
      const config = this.validateConfig(e.detail.parsed);
      if (config) {
        this.dispatchEvent(new CustomEvent('config-change', {
          detail: { config },
          bubbles: true,
          composed: true,
        }));
      }
    }
  }

  private handleSave() {
    const config = this.currentConfig;
    if (!config) return;

    this.configService.save(config);
    this.isDirty = false;

    this.dispatchEvent(new CustomEvent('config-save', {
      detail: { config },
      bubbles: true,
      composed: true,
    }));
  }

  private handleSaveAs() {
    const config = this.currentConfig;
    if (!config) return;

    const newName = prompt('Enter name for new configuration:', `${config.name} (copy)`);
    if (!newName) return;

    const newConfig: AgentConfig = {
      ...config,
      id: crypto.randomUUID(),
      name: newName,
    };

    this.configService.save(newConfig);
    this.currentId = newConfig.id;
    this.isDirty = false;

    this.dispatchEvent(new CustomEvent('config-save', {
      detail: { config: newConfig },
      bubbles: true,
      composed: true,
    }));
  }

  private initializeConfig() {
    let config: AgentConfig;

    if (this.configId) {
      const existing = this.configService.find(this.configId);
      config = existing ?? createDefaultConfig();
    } else if (this.cloneId) {
      const source = this.configService.find(this.cloneId);
      config = source
        ? { ...source, id: crypto.randomUUID(), name: `${source.name} (copy)` }
        : createDefaultConfig();
    } else {
      config = createDefaultConfig();
    }

    this.currentId = config.id;
    const { id, ...display } = config;
    this.jsonText = JSON.stringify(display, null, 2);
    this.isDirty = false;

    this.updateComplete.then(() => {
      this.dispatchEvent(new CustomEvent('config-change', {
        detail: { config },
        bubbles: true,
        composed: true,
      }));
    });
  }

  private validateConfig(parsed: unknown): AgentConfig | null {
    if (!parsed || typeof parsed !== 'object') {
      this.validationError = 'Config must be a JSON object';
      return null;
    }

    const obj = parsed as Record<string, unknown>;
    if (!obj.name || typeof obj.name !== 'string' || !obj.name.trim()) {
      this.validationError = 'Config must have a non-empty "name" field';
      return null;
    }

    this.validationError = null;
    return { id: this.currentId, ...obj } as AgentConfig;
  }

  get currentConfig(): AgentConfig | null {
    if (this.jsonError) return null;

    try {
      const parsed = JSON.parse(this.jsonText);
      return this.validateConfig(parsed);
    } catch {
      return null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-config-editor': ConfigEditor;
  }
}
