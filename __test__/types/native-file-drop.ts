import type {
  BrowserWindowEventMap,
  Webview,
  WebviewDragDropEvent,
  WebviewDragEnterEvent,
  WebviewDragLeaveEvent,
  WebviewDragOverEvent,
  WebviewOptions,
} from '../../index.js';

declare const webview: Webview;

webview.on('drag-enter', (event) => {
  const name: 'drag-enter' = event.event;
  const path: string = event.paths[0] ?? '';
  const x: number = event.position.x;
  const y: number = event.position.y;
  void [name, path, x, y];
});

webview.on('drag-over', (event) => {
  const name: 'drag-over' = event.event;
  const x: number = event.position.x;
  const y: number = event.position.y;
  void [name, x, y];
});

webview.on('drag-drop', (event) => {
  const name: 'drag-drop' = event.event;
  const paths: string[] = event.paths;
  const x: number = event.position.x;
  const y: number = event.position.y;
  void [name, paths, x, y];
});

webview.on('drag-leave', (event) => {
  const name: 'drag-leave' = event.event;
  void name;
});

const options: WebviewOptions = { nativeFileDrop: true };
const windowDrop: BrowserWindowEventMap['file-drop'] = { event: 'file-drop', files: ['/tmp/file.txt'] };
const enter: WebviewDragEnterEvent = {
  event: 'drag-enter',
  paths: ['/tmp/file.txt', '/tmp/folder'],
  position: { x: 12, y: 34 },
};
const over: WebviewDragOverEvent = { event: 'drag-over', position: { x: 12, y: 34 } };
const drop: WebviewDragDropEvent = { event: 'drag-drop', paths: ['/tmp/folder'], position: { x: 12, y: 34 } };
const leave: WebviewDragLeaveEvent = { event: 'drag-leave' };

// @ts-expect-error drag-enter requires paths
const invalidEnter: WebviewDragEnterEvent = { event: 'drag-enter', position: { x: 0, y: 0 } };
// @ts-expect-error drag-leave has no position
const invalidLeave: WebviewDragLeaveEvent = { event: 'drag-leave', position: { x: 0, y: 0 } };

void [options, windowDrop, enter, over, drop, leave, invalidEnter, invalidLeave];
