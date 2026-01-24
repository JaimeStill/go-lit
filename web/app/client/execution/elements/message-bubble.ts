import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import type { Message } from '../types';
import styles from './message-bubble.css?inline';

@customElement('gl-message-bubble')
export class MessageBubble extends LitElement {
  static styles = unsafeCSS(styles);

  @property({ type: Object }) message!: Message;
  @property({ type: Boolean }) streaming = false;

  private bubbleClass(): string {
    const role = this.message.role;
    const streaming = this.streaming ? 'streaming' : '';
    return `bubble ${role} ${streaming}`.trim();
  }

  render() {
    return html`
      <div class="${this.bubbleClass()}">
        ${this.message.content}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-message-bubble': MessageBubble;
  }
}
