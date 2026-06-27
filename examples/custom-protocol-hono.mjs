import { Hono } from 'hono';

import { Application } from '../index.js';

const router = new Hono();

function escapeHtml(value) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

router.get('/*', (context) => {
  const pathname = context.req.path;
  const pageName =
    pathname === '/'
      ? 'Home'
      : pathname
          .split('/')
          .filter(Boolean)
          .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
          .join(' / ');
  const safePageName = escapeHtml(pageName);
  const current = (path) => (path === pathname ? ' aria-current="page"' : '');
  const navigation = `
      <a href="/"${current('/')}>Home</a>
      <a href="/about"${current('/about')}>About</a>
      <a href="/products"${current('/products')}>Products</a>
      <a href="/contact"${current('/contact')}>Contact</a>
  `;

  return context.html(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${safePageName} | Hono Custom Protocol</title>
    <style>
      :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
      body { max-width: 52rem; margin: 0 auto; padding: 3rem 1.5rem; }
      nav { display: flex; gap: 1rem; margin-bottom: 3rem; }
      a { color: #4f8cff; text-underline-offset: 0.25rem; }
      a[aria-current="page"] { color: inherit; font-weight: 700; }
      code { padding: 0.2rem 0.4rem; border-radius: 0.3rem; background: #80808022; }
    </style>
  </head>
  <body>
    <nav aria-label="Main navigation">${navigation}</nav>
    <main>
      <h1>${safePageName}</h1>
      <p>This page was rendered dynamically by Hono for <code>${escapeHtml(pathname)}</code>.</p>
    </main>
  </body>
</html>`);
});

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Hono Custom Protocol',
  width: 900,
  height: 600,
});

window.registerProtocol('app', router.fetch);
window.createWebview({ url: 'app://localhost' });

app.run();
