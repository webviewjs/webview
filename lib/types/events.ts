import type { EventEmitter } from 'node:events';
import type { EventListener, NodeEventMap } from '../internal/events/event-emitter';

export type { EventListener };
export type TypedEventEmitter<TEventMap extends object> = EventEmitter<NodeEventMap<TEventMap>>;
