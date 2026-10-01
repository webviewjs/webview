import type { TrayEventPayload } from '../../js-bindings';

export type TrayEventMap = {
  click: TrayEventPayload;
  'double-click': TrayEventPayload;
  enter: TrayEventPayload;
  move: TrayEventPayload;
  leave: TrayEventPayload;
};
