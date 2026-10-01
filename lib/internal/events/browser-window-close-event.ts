import type { WindowEventPayload } from '../../../js-bindings';
import type { BrowserWindowCloseEvent as BrowserWindowCloseEventShape } from '../../types/browser-window';

export class BrowserWindowCloseEvent implements BrowserWindowCloseEventShape {
  readonly event = 'close' as const;
  #active = true;
  #prevented = false;
  readonly #preventClose: () => boolean;

  constructor(payload: WindowEventPayload, preventClose: () => boolean) {
    Object.assign(this, payload);
    this.#preventClose = preventClose;
  }

  get defaultPrevented(): boolean {
    return this.#prevented;
  }

  preventDefault(): void {
    if (!this.#active || this.#prevented) {
      return;
    }
    if (this.#preventClose()) {
      this.#prevented = true;
    }
  }

  /** @internal */
  finishDispatch(): void {
    this.#active = false;
  }
}
