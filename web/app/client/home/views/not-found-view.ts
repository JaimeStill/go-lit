import { LitElement, html, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import styles from './not-found-view.css?inline';

@customElement('gl-not-found-view')
export class NotFoundView extends LitElement {
  static styles = unsafeCSS(styles);

  @property() path?: string;

  render() {
    return html`
      <h1>Page Not Found</h1>
      <p>
        The path <span class="path">${this.path ?? 'unknown'}</span> doesn't exist.
      </p>
      <a href="" class="link-btn btn-primary">Return Home</a>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-not-found-view': NotFoundView;
  }
}
