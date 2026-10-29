import { readFile } from 'node:fs/promises';
import { expect, test } from 'bun:test';

test('tray example demonstrates close-to-tray behavior with a retained tray icon', async () => {
  const source = await readFile(new URL('../../../../apps/examples/tray.ts', import.meta.url), 'utf8');

  expect(source).toMatch(/let tray;/u);
  expect(source).toMatch(/await app\.whenReady\(\);[\s\S]*tray = app\.createTrayIcon/u);
  expect(source).toMatch(/window\.on\('close', \(event\) => \{[\s\S]*event\.preventDefault\(\)/u);
  expect(source).not.toMatch(/app\.run\(/u);
});

test('expose example demonstrates static values and an asynchronous native method', async () => {
  const source = await readFile(new URL('../../../../apps/examples/expose.ts', import.meta.url), 'utf8');

  expect(source).toMatch(/webview\.expose\('native',\s*\{/u);
  expect(source).toMatch(/isCool:\s*true/u);
  expect(source).toMatch(/version:\s*'0\.1\.4'/u);
  expect(source).toMatch(/readExample:\s*async/u);
});

test('Hono example connects router responses to the custom protocol', async () => {
  const source = await readFile(new URL('../../../../apps/examples/custom-protocol-hono.ts', import.meta.url), 'utf8');

  expect(source).toMatch(/router\.get\('\/\*'/u);
  expect(source).toMatch(/return context\.html\(/u);
  expect(source).toMatch(/window\.registerProtocol\('app', router\.fetch\)/u);
  expect(source).toMatch(/createWebview\(\{ url: 'app:\/\/localhost' \}\)/u);
});

test('ported v0 examples use the public workspace package and cover native features', async () => {
  const [drop, protocolBody, dockIcon, filePicker] = await Promise.all([
    readFile(new URL('../../../../apps/examples/native-file-drop.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/examples/custom-protocol-body.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/examples/macos-dock-icon.ts', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/examples/file-picker.ts', import.meta.url), 'utf8'),
  ]);

  for (const source of [drop, protocolBody, dockIcon, filePicker]) {
    expect(source).toMatch(/from '@webviewjs\/webview'/u);
  }
  expect(drop).toMatch(/nativeFileDrop: true/u);
  expect(drop).toMatch(/webview\.on\('drag-drop'/u);
  expect(protocolBody).toMatch(/method: 'POST'/u);
  expect(dockIcon).toMatch(/app\.setDockIcon\(icon\)/u);
  expect(dockIcon).toMatch(/app\.removeDockIcon\(\)/u);
  expect(filePicker).toMatch(/win\.openFileDialog/u);
});

test('package README and hosted docs document current entry points and API behavior', async () => {
  const [readme, customProtocols, applicationApi, quickStart] = await Promise.all([
    readFile(new URL('../../README.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/docs/content/docs/guides/custom-protocols.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/docs/content/docs/api/application.md', import.meta.url), 'utf8'),
    readFile(new URL('../../../../apps/docs/content/docs/getting-started/quick-start.md', import.meta.url), 'utf8'),
  ]);

  expect(readme).toMatch(/https:\/\/webview\.js\.org/u);
  expect(readme).not.toMatch(/app\.(?:bind|onEvent)\(/u);
  expect(customProtocols).toMatch(/return new Response\(/u);
  expect(applicationApi).toMatch(/app\.on\('custom-menu-click'/u);
  expect(quickStart).toMatch(/Keep references to objects/u);
  expect(quickStart).toMatch(/BrowserWindow.*Webview.*TrayIcon/su);
});
