import { nativeBinding, type NativeWebContext } from './internal/native-binding';
import { NativeHandle } from './internal/native-handle';

const INTERNAL_WEB_CONTEXT = Symbol('WebContext internal construction');

export class WebContext extends NativeHandle<NativeWebContext> {
  constructor();
  /** @internal */
  constructor(token: typeof INTERNAL_WEB_CONTEXT, native: NativeWebContext);
  constructor(token?: typeof INTERNAL_WEB_CONTEXT, native?: NativeWebContext) {
    super(
      token === INTERNAL_WEB_CONTEXT && native !== undefined ? native : new nativeBinding.WebContext(),
      'WebContext',
    );
  }

  /** @internal */
  static fromNative(native: NativeWebContext): WebContext {
    return new WebContext(INTERNAL_WEB_CONTEXT, native);
  }

  get dataDirectory(): string | null {
    return this.unwrap().dataDirectory;
  }

  isCustomProtocolRegistered(scheme: string): boolean {
    return this.unwrap().isCustomProtocolRegistered(scheme);
  }

  setAllowsAutomation(flag: boolean): void {
    this.unwrap().setAllowsAutomation(flag);
  }

  /** @internal */
  unwrapForNative(): NativeWebContext {
    return this.unwrap();
  }
}
