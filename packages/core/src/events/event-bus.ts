import { EventEmitter } from '@praxo/utils';
import type { EditorEventMap } from './event-map.js';

/**
 * The editor's central event bus. A thin, distinctly-named specialization of
 * `@praxo/utils`'s generic `EventEmitter`, typed to `EditorEventMap`.
 *
 * Every `PraxoEditor` instance exposes exactly one `EventBus` via
 * `editor.events`. Core, plugins, and host applications all publish and
 * subscribe through it — there is no separate internal-vs-public event
 * channel.
 */
export class EventBus extends EventEmitter<EditorEventMap> {}
