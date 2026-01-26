import { LitElement, html, nothing, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import styles from './prompt-input.css?inline';

@customElement('gl-prompt-input')
export class PromptInput extends LitElement {
  static styles = unsafeCSS(styles);
  private imageUrls = new Map<File, string>();

  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) streaming = false;
  @property({ type: Boolean }) enableVision = false;

  @query('textarea') private textarea!: HTMLTextAreaElement;
  @query('input[type="file"]') private fileInput!: HTMLInputElement;

  @state() private selectedImages: File[] = [];

  disconnectedCallback() {
    super.disconnectedCallback();
    this.revokeAllUrls();
  }

  render() {
    return html`
      <form @submit=${this.handleSubmit}>
        ${this.renderImageSection()}
        <div class="input-row">
          <textarea
            placeholder="Type a message..."
            @keydown=${this.handleKeydown}
            ?disabled=${this.disabled || this.streaming}
          ></textarea>
        </div>
        ${this.renderButton()}
      </form>
    `;
  }

  private renderButton() {
    if (this.streaming) {
      return html`
        <button type="button" class="btn-danger" @click=${this.handleCancel}>
          Cancel
        </button>
      `;
    }

    return html`
      <button type="submit" class="btn-primary" ?disabled=${this.disabled}>
        Send
      </button>
    `;
  }

  private renderImagePreviews() {
    if (this.selectedImages.length < 1)
      return nothing;

    return html`
      <div class="image-previews">
        ${this.selectedImages.map((file, index) => html`
          <div class="image-preview">
            <img src=${this.getImageUrl(file)} alt=${file.name}>
            <button
              type="button"
              class="remove-btn"
              @click=${() => this.removeImage(index)}
            >x</button>
          </div>
        `)}
      </div>
    `;
  }

  private renderImageSection() {
    if (!this.enableVision)
      return nothing;

    return html`
      <div class="image-section">
        <input
          type="file"
          accept="image/*"
          multiple
          @change=${this.handleFileSelect}
          ?disabled=${this.disabled || this.streaming}
          hidden
        >
        <button
          type="button"
          class="btn-secondary attach-btn"
          @click=${this.triggerFileInput}
          ?disabled=${this.disabled || this.streaming}
        >
          Attach Images
        </button>
        ${this.renderImagePreviews()}
      </div>
    `;
  }

  private clearImages() {
    this.revokeAllUrls();
    this.selectedImages = [];
  }

  private getImageUrl(file: File): string {
    let url = this.imageUrls.get(file);
    if (!url) {
      url = URL.createObjectURL(file);
      this.imageUrls.set(file, url);
    }
    return url;
  }

  private handleCancel() {
    this.dispatchEvent(
      new CustomEvent('cancel-stream', {
        bubbles: true,
        composed: true,
      })
    );
  }

  private handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.selectedImages = [...this.selectedImages, ...Array.from(input.files)];
      input.value = '';
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.handleSubmit(e);
    }
  }

  private handleSubmit(e: Event) {
    e.preventDefault();
    const value = this.textarea.value.trim();
    if (!value || this.disabled) return;

    if (this.selectedImages.length > 0) {
      this.dispatchEvent(
        new CustomEvent('submit-vision', {
          detail: { prompt: value, images: this.selectedImages },
          bubbles: true,
          composed: true,
        })
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('submit-prompt', {
          detail: { prompt: value },
          bubbles: true,
          composed: true,
        })
      );
    }
    this.textarea.value = '';
    this.clearImages();
  }

  private removeImage(index: number) {
    const file = this.selectedImages[index];
    this.revokeImageUrl(file);
    this.selectedImages = this.selectedImages.filter((_, i) => i !== index);
  }

  private revokeAllUrls() {
    this.imageUrls.forEach((url) => URL.revokeObjectURL(url));
    this.imageUrls.clear();
  }

  private revokeImageUrl(file: File) {
    const url = this.imageUrls.get(file);
    if (url) {
      URL.revokeObjectURL(url);
      this.imageUrls.delete(file);
    }
  }
  private triggerFileInput() {
    this.fileInput.click();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'gl-prompt-input': PromptInput;
  }
}
