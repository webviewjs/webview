import type { ApplicationRunOptions } from '../../../js-bindings';

export class ApplicationEventLoop {
  /** Active interval timer, absent while the loop is stopped. */
  #timer?: NodeJS.Timeout;
  /** Callback that pumps native events and reports whether the application remains active. */
  readonly #pumpEvents: () => boolean;
  /** Whether a native pump call is currently on the stack. */
  #pumping = false;

  /**
   * Creates an event loop around the native application event pump.
   * @param pumpEvents Polls the native event queue and returns whether to keep running.
   */
  constructor(pumpEvents: () => boolean) {
    this.#pumpEvents = pumpEvents;
  }

  /** Whether native events are being pumped right now, including callbacks dispatched by the pump. */
  get isPumping(): boolean {
    return this.#pumping;
  }

  /**
   * Starts polling unless a timer is already active.
   * @param options Poll interval and whether the timer keeps Node.js alive.
   */
  start(options: ApplicationRunOptions = {}): void {
    if (this.#timer !== undefined) {
      return;
    }

    const interval = options.interval ?? 16;
    const shouldRef = options.ref ?? true;
    const timer = setInterval(() => {
      this.#pumping = true;
      try {
        if (!this.#pumpEvents()) {
          this.stop();
        }
      } finally {
        this.#pumping = false;
      }
    }, interval);

    if (!shouldRef) {
      timer.unref();
    }
    this.#timer = timer;
  }

  /** Stops polling and clears the active interval timer. */
  stop(): void {
    if (this.#timer === undefined) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = undefined;
  }
}
