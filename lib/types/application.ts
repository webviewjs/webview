import type { ApplicationEvent as NativeApplicationEvent } from '../../js-bindings';

export type { ApplicationOptions, ApplicationRunOptions, MenuOptions } from '../../js-bindings';

export interface ApplicationEventMap {
  'window-close-requested': NativeApplicationEvent;
  'application-close-requested': NativeApplicationEvent;
  'custom-menu-click': NativeApplicationEvent;
  ready: NativeApplicationEvent;
}

export type ApplicationWhenReadyOptions =
  | {
      autoRun?: true;
      interval?: number;
      ref?: boolean;
    }
  | {
      autoRun: false;
      interval?: never;
      ref?: never;
    };
