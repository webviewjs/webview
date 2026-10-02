import type { GeneratedFile } from '../project.js';

export function typescriptTemplate(projectName: string, webviewVersion: string): GeneratedFile[] {
  return [
    {
      path: 'package.json',
      content: `${JSON.stringify(
        {
          name: projectName,
          private: true,
          type: 'module',
          scripts: {
            dev: 'node src/main.ts',
            start: 'node src/main.ts',
            build: `webview build src/main.ts --name ${projectName} --asset src/index.html`,
          },
          dependencies: { '@webviewjs/webview': webviewVersion },
          engines: { node: '>=24' },
        },
        null,
        2,
      )}\n`,
    },
    {
      path: 'README.md',
      content: `# ${projectName}\n\nA native desktop application built with [WebviewJS](https://webview.js.org).\n\n## Develop\n\n\`\`\`sh\nnpm run dev\n\`\`\`\n\nEdit \`src/index.html\` to change the window content.\n\n## Build a standalone executable\n\n\`\`\`sh\nnpm run build\n\`\`\`\n`,
    },
    {
      path: '.gitignore',
      content: 'node_modules/\ndist/\n',
    },
    {
      path: 'src/main.ts',
      content: `import { readFile } from 'node:fs/promises';
import { getAsset, isSea } from 'node:sea';
import { Application } from '@webviewjs/webview';

const app: Application = new Application();

async function main(): Promise<void> {
  const window = app.createBrowserWindow({
    title: ${JSON.stringify(titleFromProjectName(projectName))},
    width: 1024,
    height: 768,
  });

  const html = isSea()
    ? getAsset('index.html', 'utf8')
    : await readFile(new URL('./index.html', import.meta.url), 'utf8');
  window.createWebview({ html });

  app.run();
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
`,
    },
    { path: 'src/index.html', content: starterHtml(projectName) },
  ];
}

function titleFromProjectName(projectName: string): string {
  return projectName
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase() + part.slice(1))
    .join(' ');
}

function starterHtml(projectName: string): string {
  const title = titleFromProjectName(projectName);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#111111" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root { color-scheme: dark; font-family: Inter, ui-sans-serif, system-ui, sans-serif; }
      * { box-sizing: border-box; }
      body { min-height: 100vh; margin: 0; display: grid; place-items: center; color: #f5f5f5; background: radial-gradient(ellipse at 50% 0%, #321317 0, #171214 42%, #101010 78%); }
      main { width: min(100% - 40px, 560px); padding: 48px; border: 1px solid #ffffff18; border-radius: 24px; background: #171717cc; box-shadow: 0 24px 80px #0008; }
      .mark { display: inline-flex; align-items: center; gap: 10px; color: #ff6868; font-size: 13px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; }
      .mark::before { width: 9px; height: 9px; border-radius: 50%; background: #fa5353; box-shadow: 0 0 18px #fa535388; content: ''; }
      h1 { margin: 24px 0 12px; font-size: clamp(32px, 7vw, 48px); letter-spacing: -.045em; }
      p { color: #aaa; line-height: 1.7; }
      code { color: #ff8b8b; font-size: .92em; }
      .status { display: inline-flex; align-items: center; gap: 8px; margin-top: 16px; padding: 9px 12px; border: 1px solid #ffffff14; border-radius: 999px; color: #d8d8d8; background: #ffffff08; font-size: 12px; }
      .status::before { width: 7px; height: 7px; border-radius: 50%; background: #72d6a0; content: ''; }
      @media (max-width: 520px) { main { padding: 32px 26px; } }
    </style>
  </head>
  <body>
    <main>
      <div class="mark">WebviewJS</div>
      <h1>Your native window is running.</h1>
      <p>This is <strong>${escapeHtml(title)}</strong>, a local page rendered in a native desktop window.</p>
      <p>Edit <code>src/index.html</code> to get started.</p>
      <div class="status">Desktop application ready</div>
    </main>
  </body>
</html>
`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => {
    switch (character) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });
}
