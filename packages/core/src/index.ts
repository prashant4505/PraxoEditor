export { PraxoEditor } from './editor/praxo-editor.js';
export type { EditorConfig } from './editor/editor-config.js';

export { EventBus } from './events/event-bus.js';
export type {
  EditorEventMap,
  ChangeEventPayload,
  SelectionChangeEventPayload,
  ClipboardEventPayload,
  PluginLifecycleEventPayload,
} from './events/event-map.js';

export { CommandRegistry } from './commands/command-registry.js';
export type { Command, CommandContext } from './commands/command.js';

export { PluginManager } from './plugins/plugin-manager.js';
export type { Plugin, PluginContext } from './plugins/plugin.js';

export { PraxoError } from './errors/praxo-error.js';
export type { PraxoErrorCode } from './errors/praxo-error.js';
