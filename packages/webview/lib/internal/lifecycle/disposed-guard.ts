/** Native members that read no window or webview state, so they stay usable after disposal. */
const DISPOSAL_SAFE_GETTERS = new Set<string>(['isChild']);

/** Wrapper functions created by the guard, so callers can tell them apart from other replacements. */
const guardWrappers = new WeakSet<object>();

/** Native object surface needed to check liveness before a member reads native state. */
interface DisposableNative {
  /** Reports whether the native object has already released its handle. */
  isDisposed(): boolean;
}

/**
 * Reports whether a value is a wrapper installed by {@link guardDisposedNativeMembers}.
 * @param value Method or accessor function taken from a prototype descriptor.
 */
export function isDisposalGuardWrapper(value: unknown): boolean {
  return typeof value === 'function' && guardWrappers.has(value);
}

/**
 * Makes native methods and getters on a prototype throw a JavaScript error after disposal.
 * Without this, a call on a disposed object reaches Rust code that expects a live handle and aborts
 * the process. Call it before any TypeScript methods are installed, so only native members are wrapped.
 * @param prototype Native prototype whose own methods and getters should be guarded.
 * @param className Class name used in the disposal error message.
 */
export function guardDisposedNativeMembers(prototype: object, className: string): void {
  if (!('isDisposed' in prototype)) {
    return;
  }

  const assertLive = (native: DisposableNative): void => {
    if (native.isDisposed()) {
      throw new Error(`${className} has been disposed`);
    }
  };

  for (const name of Object.getOwnPropertyNames(prototype)) {
    if (name === 'constructor' || name === 'dispose' || name === 'isDisposed') {
      continue;
    }
    const descriptor = Object.getOwnPropertyDescriptor(prototype, name);
    if (descriptor === undefined) {
      continue;
    }

    if (typeof descriptor.value === 'function') {
      const nativeMethod = descriptor.value as (...args: unknown[]) => unknown;
      const guardedMethod = function guardedMethod(this: DisposableNative, ...args: unknown[]): unknown {
        assertLive(this);
        return Reflect.apply(nativeMethod, this, args);
      };
      guardWrappers.add(guardedMethod);
      Object.defineProperty(prototype, name, { ...descriptor, value: guardedMethod });
    } else if (typeof descriptor.get === 'function' && !DISPOSAL_SAFE_GETTERS.has(name)) {
      const nativeGetter = descriptor.get as (this: object) => unknown;
      const guardedGetter = function guardedGetter(this: DisposableNative): unknown {
        assertLive(this);
        return Reflect.apply(nativeGetter, this, []);
      };
      guardWrappers.add(guardedGetter);
      Object.defineProperty(prototype, name, { ...descriptor, get: guardedGetter });
    }
  }
}
