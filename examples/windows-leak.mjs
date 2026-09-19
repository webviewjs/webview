//node --expose-gc .\examples\windows-leak.mjs 2>&1 | Tee-Object -FilePath ./examples/windows-leak.txt
import { execFileSync } from 'node:child_process';
import { setTimeout as sleep } from 'node:timers/promises';
import { Application } from '../index.js';

if (!global.gc) {
  throw new Error('Run with node --expose-gc');
}

function handleCount() {
  try {
    return Number(
      execFileSync(
        'powershell.exe',
        ['-NoProfile', '-NonInteractive', '-Command', `(Get-Process -Id ${process.pid}).HandleCount`],
        {
          encoding: 'utf8',
          windowsHide: true,
        },
      ).trim(),
    );
  } catch {
    return null;
  }
}

function snapshot(label) {
  const m = process.memoryUsage();

  console.log(label, {
    rssMB: Math.round(m.rss / 1024 / 1024),
    heapUsedMB: Math.round(m.heapUsed / 1024 / 1024),
    externalMB: Math.round(m.external / 1024 / 1024),
    handles: handleCount(),
  });
}

async function gc() {
  for (let i = 0; i < 5; i++) {
    global.gc();
    await sleep(100);
  }
}

// Baseline before WebviewJS creates an Application/EventLoop.
console.log(`PID: ${process.pid}`);
snapshot('before Application');

const app = new Application();

await app.whenReady();

snapshot('after Application ready');

// Keep one window alive so disposing all test windows does not cause
// WebviewJS to finalize the entire Application between cycles.
const anchor = app.createBrowserWindow({
  title: 'leak-test-anchor',
  width: 1,
  height: 1,
  visible: false,
  windowsSkipTaskbar: true,
});

snapshot('after anchor');

async function cycle(index, count = 25) {
  console.log(`\n=== cycle ${index} ===`);

  const windows = [];

  for (let i = 0; i < count; i++) {
    const win = app.createBrowserWindow({
      title: `Leak test ${index}-${i}`,
      width: 300,
      height: 200,
      visible: false,
      windowsSkipTaskbar: true,
    });

    win.createWebview({
      html: `<h1>${index}-${i}</h1>`,
    });

    windows.push(win);
  }

  // Let WebView2/window initialization settle.
  await sleep(2000);

  snapshot('after create');

  for (const win of windows) {
    win.dispose();
  }

  windows.length = 0;

  await gc();

  // Give Tao, Wry, WebView2 and Win32 deferred destruction time to run.
  await sleep(3000);

  snapshot('after dispose');
}

// Warm up WebView2 separately so its one-time initialization costs don't
// distort subsequent cycles.
await cycle('warmup', 1);

for (let i = 1; i <= 50; i++) {
  await cycle(i, 25);
}

console.log('\n=== cycles complete ===');

await gc();
await sleep(3000);

snapshot('after all cycles');

console.log('\nKeeping process alive for 60 seconds for Task Manager / Process Explorer inspection...');

await sleep(60_000);

await gc();
snapshot('before app.exit()');

// Let Application own shutdown of the remaining anchor window/resources.
// Don't dispose the anchor manually first, since we specifically want to
// measure the app.exit() cleanup path.
app.exit();

await sleep(3000);
await gc();

snapshot('after app.exit()');

console.log('\nTest complete.');
