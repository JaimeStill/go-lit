import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, type ExecutionService } from '../service';
import type { AgentConfig } from '@app/config/types';
import './message-list';
import '../elements/prompt-input';
import styles from './chat-panel.css?inline';

/*
 * Chat panel component.
 * Receives config as prop - parent view handles config selection/editing.
 */
@customElement('gl-chat-panel')
export class ChatPanel extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: executionServiceContext })
  private executionService!: ExecutionService;

  @property({ type: Object }) config?: AgentConfig;

  private handleCancel() {
    this.executionService.cancel();
  }

  private handleSubmit(e: CustomEvent<{ prompt: string }>) {
    if (!this.config) return;
    this.executionService.chat(this.config, e.detail.prompt);
  }

  private handleVisionSubmit(e: CustomEvent<{ prompt: string, images: File[] }>) {
    if (!this.config) return;
    this.executionService.vision(this.config, e.detail.prompt, e.detail.images);
  }

  private renderError() {
    const error = this.executionService.error.get();
    if (!error) return nothing;

    return html`<div class="error">${error}</div>`;
  }

  private renderNoConfig() {
    return html`
      <div class="no-config">
        Select or create a configuration to start chatting.
      </div>
    `;
  }

  private get supportsVision(): boolean {
    return !!this.config?.model?.capabilities?.vision;
  }

  render() {
    const streaming = this.executionService.streaming.get();

    if (!this.config) {
      return this.renderNoConfig();
    }

    return html`
      ${this.renderError()}

      <gl-message-list></gl-message-list>

      <div class="input-bar">
        <gl-prompt-input
          ?streaming=${streaming}
          ?enableVision=${this.supportsVision}
          @submit-prompt=${this.handleSubmit}
          @submit-vision=${this.handleVisionSubmit}
          @cancel-stream=${this.handleCancel}
        ></gl-prompt-input>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-chat-panel': ChatPanel;
  }
}
