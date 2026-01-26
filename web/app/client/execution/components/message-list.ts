import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import { consume } from '@lit/context';
import { SignalWatcher } from '@lit-labs/signals';
import { executionServiceContext, type ExecutionService } from '../service';
import type { Message } from '../types';
import '../elements/message-bubble';
import styles from './message-list.css?inline';

@customElement('gl-message-list')
export class MessageList extends SignalWatcher(LitElement) {
  static styles = unsafeCSS(styles);

  @consume({ context: executionServiceContext })
  private executionService!: ExecutionService;

  private renderEmpty() {
    return html`
      <div class="empty">Start a conversation by sending a message.</div>
    `;
  }

  private renderMessages(messages: Message[]) {
    return messages.map((msg) => html`
      <gl-message-bubble .message=${msg}></gl-message-bubble>
    `)
  }

  private renderStreamingBubble() {
    const streaming = this.executionService.streaming.get();
    const current = this.executionService.currentResponse.get();

    if (!streaming || !current) return nothing;

    return html`<div class="streaming-bubble">${current}</div>`
  }

  private scrollToBottom() {
    this.scrollTop = this.scrollHeight;
  }

  updated() {
    if (this.executionService.streaming.get()) {
      this.scrollToBottom();
    }
  }

  render() {
    const messages = this.executionService.messages.get();
    const streaming = this.executionService.streaming.get();

    if (messages.length === 0 && !streaming) {
      return this.renderEmpty();
    }

    return html`
      ${this.renderMessages(messages)}
      ${this.renderStreamingBubble()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-message-list': MessageList;
  }
}
