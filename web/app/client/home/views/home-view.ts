import { LitElement, html, unsafeCSS } from 'lit';
import { customElement } from 'lit/decorators.js';
import styles from './home-view.css?inline';

@customElement('gl-home-view')
export class HomeView extends LitElement {
  static styles = unsafeCSS(styles);

  render() {
    return html`
      <h1>Go + Lit</h1>
      <p class="description">
        A Go + Lit architecture proof of concept demonstrating clean separation 
        between server (data/routing) and client (presentation/state/management).
      </p>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-home-view': HomeView;
  }
}
