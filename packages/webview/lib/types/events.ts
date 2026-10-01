import type { EventEmitter } from 'node:events';
import type { EventListener, NodeEventMap } from '../internal/events/event-emitter';

/** A listener that receives one typed event payload. */
export type { EventListener };
/** Node.js `EventEmitter` type parameterized with a WebviewJS event map. */
export type TypedEventEmitter<TEventMap extends object> = EventEmitter<NodeEventMap<TEventMap>>;
