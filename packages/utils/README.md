# @praxo/utils

Framework-agnostic primitives shared across Praxo Editor packages. This package has **no
knowledge of editors, documents, or DOM editing** — it exists so that `@praxo/core` and future
packages (`@praxo/model`, `@praxo/engine`, ...) don't each reinvent the same small pieces.

## Exports

| Export | Description |
| --- | --- |
| `EventEmitter<EventMap>` | Generic, strongly-typed publish/subscribe emitter. |
| `uniqueId(prefix?)` | Short, human-readable id generator (not cryptographically secure). |
| `assert(condition, message)` | Throws `AssertionError` for programming-error invariants. |

## Usage

```ts
import { EventEmitter } from '@praxo/utils';

interface MyEvents extends Record<string, unknown> {
  tick: { count: number };
}

const emitter = new EventEmitter<MyEvents>();
const off = emitter.on('tick', ({ count }) => console.log(count));
emitter.emit('tick', { count: 1 });
off();
```
