import assert from 'node:assert/strict';
import { test } from 'node:test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const skip = process.platform !== 'darwin' || process.env.WEBVIEW_NATIVE_TESTS !== '1';
const fixture = fileURLToPath(new URL('./fixtures/macos.mjs', import.meta.url));

for (const runtime of ['node', 'bun']) {
  for (const scenario of ['loading', 'shadows']) {
    test(`${runtime}: real macOS ${scenario}`, { skip, timeout: 30000 }, async () => {
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
        res.end(`<h1>hello</h1><script>setInterval(()=>{fetch('/tick');window.ipc.postMessage('tick')},100)</script>`);
      });
      await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
      const address = server.address();
      assert.ok(address && typeof address !== 'string');
      // HTTP stays responsive even when a native pump blocks its child.
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
      const completion = new Promise((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      try {
        assert.equal(await completion, 0, errors);
        const result = JSON.parse(output.trim());
        console.info(runtime, scenario, { ...result, roots, ticks });
        if (scenario === 'loading') {
          assert.equal(result.pages, 3);
          assert.ok(result.ipc >= 9);
          assert.ok(roots >= 1);
          assert.ok(ticks >= 2);
        } else {
          assert.equal(result.combinations, 16);
        }
      } finally {
        clearTimeout(watchdog);
        if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        await completion.catch(() => {});
        await new Promise((resolve) => server.close(() => resolve()));
      }
    });
  }
}
