import type { WindowEventPayload } from '../../../js-bindings';
import type { BrowserWindowCloseEvent as BrowserWindowCloseEventShape } from '../../types/browser-window';

export class BrowserWindowCloseEvent implements BrowserWindowCloseEventShape {
  /** Close-event discriminator exposed to listeners. */
  readonly event = 'close' as const;
  /** Whether `preventDefault` is still valid for the current dispatch. */
  #active = true;
  /** Whether the native close request was successfully prevented. */
  #prevented = false;
  /** Native callback that cancels the pending close request. */
  readonly #preventClose: () => boolean;

  /**
   * Creates the event wrapper used while dispatching a native close request.
   * @param payload Native event fields copied onto this instance.
   * @param preventClose Native cancellation callback.
   */
  constructor(payload: WindowEventPayload, preventClose: () => boolean) {
    Object.assign(this, payload);
    this.#preventClose = preventClose;
  }

  /** Whether a listener successfully cancelled the native close request. */
  get defaultPrevented(): boolean {
    return this.#prevented;
  }

  /** Requests cancellation of the pending close while listeners are running. */
  preventDefault(): void {
    if (!this.#active || this.#prevented) {
      return;
    }
    if (this.#preventClose()) {
      this.#prevented = true;
    }
  }

  /**
   * Marks the end of event dispatch so later calls to `preventDefault` have no effect.
   * @internal
   */
  finishDispatch(): void {
    this.#active = false;
  }
}
