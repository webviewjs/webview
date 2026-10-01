export interface NativeDisposable {
  dispose(): void;
  isDisposed(): boolean;
}

export class NativeHandle<T extends NativeDisposable> {
  readonly #native: T;
  readonly #name: string;

  constructor(native: T, name: string) {
    this.#native = native;
    this.#name = name;
  }

  protected unwrap(): T {
    this.assertNotDisposed();
    return this.#native;
  }

  /** @internal */
  unwrapForNative(): T {
    return this.unwrap();
  }

  protected assertNotDisposed(): void {
    if (this.#native.isDisposed()) {
      throw new Error(this.#name + ' has been disposed');
    }
  }

  isDisposed(): boolean {
    return this.#native.isDisposed();
  }

  dispose(): void {
    this.#native.dispose();
  }

  [Symbol.dispose](): void {
    this.dispose();
  }
}
