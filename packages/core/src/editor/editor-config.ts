import type { Plugin } from '../plugins/plugin.js';

/** Configuration accepted by `new PraxoEditor(config)`. */
export interface EditorConfig {
  /**
   * The host element, or a CSS selector resolving to it.
   *
   * Praxo does not create this element for you — the host application owns
   * it, which is what makes the library embeddable inside Drupal render
   * arrays, Laravel Blade templates, and framework components alike.
   */
  readonly element: string | HTMLElement;

  /** Placeholder text shown while the editor has no content. */
  readonly placeholder?: string;

  /**
   * Initial HTML content. When omitted, the editor adopts whatever markup
   * is already inside `element`.
   */
  readonly data?: string;

  /** Plugins to install immediately, in order, during construction. */
  readonly plugins?: readonly Plugin[];
}
