import type { ApplicationRunOptions } from '../../../js-bindings';

export class ApplicationEventLoop {
  #timer?: NodeJS.Timeout;
  readonly #pumpEvents: () => boolean;

  constructor(pumpEvents: () => boolean) {
    this.#pumpEvents = pumpEvents;
  }

  start(options: ApplicationRunOptions = {}): void {
    if (this.#timer !== undefined) {
      return;
    }

    const interval = options.interval ?? 16;
    const shouldRef = options.ref ?? true;
    const timer = setInterval(() => {
      if (!this.#pumpEvents()) {
        this.stop();
      }
    }, interval);

    if (!shouldRef) {
      timer.unref();
    }
    this.#timer = timer;
  }

  stop(): void {
    if (this.#timer === undefined) {
      return;
    }
    clearInterval(this.#timer);
    this.#timer = undefined;
  }
}
