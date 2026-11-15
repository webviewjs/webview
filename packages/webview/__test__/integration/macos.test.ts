import { expect, test } from 'bun:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

// Opt in: these tests open real AppKit windows and must never use the fake preload.
const nativeTest = process.platform === 'darwin' && process.env.WEBVIEW_NATIVE_TESTS === '1' ? test : test.skip;
const fixture = fileURLToPath(new URL('./fixtures/macos.mjs', import.meta.url));

for (const runtime of ['node', 'bun']) {
  for (const scenario of ['loading', 'shadows']) {
    nativeTest(
      `${runtime}: real macOS ${scenario}`,
      async () => {
        let roots = 0;
        let ticks = 0;
        const server = createServer((req, res) => {
          if (req.url === '/tick') {
            ticks++;
            res.writeHead(204).end();
            return;
          }
          roots++;
          res.writeHead(200, { 'content-type': 'text/html' });
          res.end(
            `<h1>hello</h1><script>setInterval(()=>{fetch('/tick');window.ipc.postMessage('tick')},100)</script>`,
          );
        });
        await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
        const address = server.address();
        if (!address || typeof address === 'string') throw new Error('Missing HTTP address');
        // The HTTP server stays responsive even if a native pump blocks its child.
        const child = spawn(runtime, [fixture, scenario, `http://127.0.0.1:${address.port}/`], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        let output = '';
        let errors = '';
        child.stdout.on('data', (chunk) => {
          output += chunk;
        });
        child.stderr.on('data', (chunk) => {
          errors += chunk;
        });
        const watchdog = setTimeout(() => child.kill('SIGKILL'), 25000);
        const completion = new Promise<number | null>((resolve, reject) => {
          child.once('error', reject);
          child.once('close', resolve);
        });
        try {
          expect(await completion, errors).toBe(0);
          const result = JSON.parse(output.trim());
          console.info(runtime, scenario, { ...result, roots, ticks });
          if (scenario === 'loading') {
            expect(result.pages).toBe(3);
            expect(result.ipc).toBeGreaterThanOrEqual(9);
            expect(roots).toBeGreaterThanOrEqual(1);
            expect(ticks).toBeGreaterThanOrEqual(2);
          } else {
            expect(result.combinations).toBe(16);
          }
        } finally {
          clearTimeout(watchdog);
          if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
          await completion.catch(() => {});
          await new Promise<void>((resolve) => server.close(() => resolve()));
        }
      },
      30000,
    );
  }
}
