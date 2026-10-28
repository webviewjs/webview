import { Application } from '../index.js';

const app = new Application();
const window = app.createBrowserWindow({
  title: 'Dock Icon Studio',
  width: 820,
  height: 620,
});

const webview = window.createWebview({
  html: /* html */ `<!doctype html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Dock Icon Studio</title>
        <style>
          :root {
            color-scheme: light;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            color: #20283a;
            background: #f3f5fa;
            font-synthesis: none;
            text-rendering: optimizeLegibility;
          }

          * { box-sizing: border-box; }

          body {
            min-width: 620px;
            min-height: 100vh;
            margin: 0;
            background:
              radial-gradient(ellipse at 18% 0%, rgba(126, 148, 255, .15), transparent 35%),
              radial-gradient(ellipse at 100% 80%, rgba(151, 126, 255, .10), transparent 34%),
              #f3f5fa;
          }

          button, input { font: inherit; }

          .shell {
            width: min(100%, 820px);
            margin: 0 auto;
            padding: 28px 36px 32px;
          }

          .topbar, .brand, .platform, .card-heading, .actions, .status {
            display: flex;
            align-items: center;
          }

          .topbar { justify-content: space-between; margin-bottom: 25px; }
          .brand { gap: 12px; }

          .brand-mark {
            display: grid;
            width: 42px;
            height: 42px;
            place-items: center;
            border-radius: 14px;
            color: #fff;
            font-size: 21px;
            background: linear-gradient(145deg, #7188f6, #9069db);
            box-shadow: 0 8px 18px rgba(104, 113, 222, .26);
          }

          .eyebrow {
            margin: 0 0 4px;
            color: #778198;
            font-size: 10px;
            font-weight: 750;
            letter-spacing: .13em;
            text-transform: uppercase;
          }

          h1 { margin: 0; font-size: 16px; font-weight: 700; letter-spacing: -.02em; }

          .platform {
            gap: 7px;
            padding: 8px 11px;
            border: 1px solid #e2e6ef;
            border-radius: 999px;
            color: #667087;
            background: rgba(255, 255, 255, .72);
            font-size: 11px;
            font-weight: 650;
          }

          .platform-dot, .status-dot {
            width: 7px;
            height: 7px;
            flex: 0 0 auto;
            border-radius: 50%;
            background: #4aaf83;
          }

          .hero { margin-bottom: 22px; }
          .hero .eyebrow { margin-bottom: 7px; color: #747f99; }
          h2 { margin: 0; font-size: 27px; letter-spacing: -.045em; line-height: 1.12; }
          .intro { margin: 8px 0 0; color: #737d91; font-size: 13px; line-height: 1.5; }

          .workspace {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
          }

          .card {
            min-width: 0;
            padding: 18px;
            border: 1px solid #e4e8f0;
            border-radius: 19px;
            background: rgba(255, 255, 255, .88);
            box-shadow: 0 12px 32px rgba(49, 60, 88, .055);
          }

          .card-heading { justify-content: space-between; margin-bottom: 13px; }
          .card-title { margin: 0; font-size: 13px; font-weight: 720; }
          .card-note { color: #8b94a6; font-size: 10px; }

          .preview-stage {
            display: grid;
            min-height: 216px;
            place-items: center;
            overflow: hidden;
            border: 1px solid #e8ebf2;
            border-radius: 14px;
            background-color: #f5f7fb;
            background-image:
              linear-gradient(45deg, #e9edf5 25%, transparent 25%),
              linear-gradient(-45deg, #e9edf5 25%, transparent 25%),
              linear-gradient(45deg, transparent 75%, #e9edf5 75%),
              linear-gradient(-45deg, transparent 75%, #e9edf5 75%);
            background-position: 0 0, 0 11px, 11px -11px, -11px 0;
            background-size: 22px 22px;
          }

          .preview-image {
            display: block;
            width: 156px;
            height: 156px;
            padding: 12px;
            border: 1px solid rgba(31, 44, 70, .08);
            border-radius: 34px;
            object-fit: contain;
            background: #fff;
            box-shadow: 0 16px 35px rgba(38, 48, 74, .17);
          }

          .preview-empty { display: grid; justify-items: center; gap: 8px; color: #8c95a6; font-size: 11px; }
          .placeholder-icon {
            display: grid;
            width: 66px;
            height: 66px;
            place-items: center;
            border: 1px solid #e0e5ef;
            border-radius: 21px;
            color: #8795d8;
            font-size: 27px;
            background: rgba(255, 255, 255, .85);
            box-shadow: 0 8px 20px rgba(44, 56, 84, .08);
          }

          .preview-caption {
            min-height: 30px;
            margin: 10px 2px 0;
            color: #8992a3;
            font-size: 10px;
            line-height: 1.45;
          }

          label { display: block; margin-bottom: 8px; font-size: 11px; font-weight: 700; }
          .url-input {
            width: 100%;
            height: 41px;
            padding: 0 12px;
            border: 1px solid #dfe4ed;
            border-radius: 10px;
            outline: none;
            color: #242d41;
            background: #fbfcfe;
            font-size: 11px;
            transition: border-color .15s, box-shadow .15s;
          }

          .url-input:focus { border-color: #8192e8; box-shadow: 0 0 0 3px rgba(129, 146, 232, .16); }
          .hint { min-height: 30px; margin: 8px 0 16px; color: #8992a3; font-size: 10px; line-height: 1.5; }
          .actions { gap: 8px; }

          .button {
            min-height: 39px;
            padding: 0 12px;
            border: 1px solid transparent;
            border-radius: 10px;
            cursor: pointer;
            font-size: 10px;
            font-weight: 700;
            transition: transform .12s, opacity .12s, box-shadow .12s;
          }

          .button:not(:disabled):active { transform: translateY(1px); }
          .button:disabled { cursor: not-allowed; opacity: .45; }
          .button-primary { flex: 1; color: #fff; background: #596fd2; box-shadow: 0 6px 13px rgba(78, 98, 196, .2); }
          .button-primary:not(:disabled):hover { background: #4d63c4; }
          .button-secondary { color: #606b80; border-color: #e0e5ee; background: #fff; }
          .button-secondary:not(:disabled):hover { background: #f7f8fb; }

          .status {
            gap: 9px;
            min-height: 44px;
            margin-top: 14px;
            padding: 10px 11px;
            border: 1px solid #e8ebf1;
            border-radius: 11px;
            color: #768095;
            background: #f8f9fc;
            font-size: 10px;
            line-height: 1.4;
          }

          .status .status-dot { background: #a6afbf; }
          .status.success { color: #287753; border-color: #cde9dc; background: #f1faf5; }
          .status.success .status-dot { background: #42a878; }
          .status.error { color: #a43e4c; border-color: #f0d3d7; background: #fff6f7; }
          .status.error .status-dot { background: #d35b68; }
          .status.warning { color: #8a6529; border-color: #efdfbb; background: #fffaf0; }
          .status.warning .status-dot { background: #d49a39; }
          .status.info .status-dot { background: #7185dc; }

          .footer { margin-top: 15px; color: #929aab; font-size: 10px; text-align: center; }
          [hidden] { display: none !important; }

          @media (max-width: 680px) {
            .shell { padding: 22px 20px; }
            .workspace { grid-template-columns: 1fr; }
            .preview-stage { min-height: 180px; }
            .card { padding: 15px; }
          }
        </style>
      </head>
      <body>
        <main class="shell">
          <header class="topbar">
            <div class="brand">
              <div class="brand-mark" aria-hidden="true">✦</div>
              <div>
                <p class="eyebrow">WebviewJS example</p>
                <h1>Dock Icon Studio</h1>
              </div>
            </div>
            <div class="platform"><span class="platform-dot"></span><span id="platform-label">macOS</span></div>
          </header>

          <section class="hero">
            <p class="eyebrow">APP APPEARANCE</p>
            <h2>A fresh look for your Dock.</h2>
            <p class="intro">Preview an image, apply it to the Dock, or restore your app's original icon.</p>
          </section>

          <section class="workspace" aria-label="Dock icon controls">
            <article class="card">
              <div class="card-heading">
                <h3 class="card-title">Icon preview</h3>
                <span class="card-note">Transparent backgrounds supported</span>
              </div>
              <div class="preview-stage">
                <div class="preview-empty" id="preview-empty">
                  <div class="placeholder-icon" aria-hidden="true">✦</div>
                  <span id="placeholder-title">Your preview appears here</span>
                </div>
                <img class="preview-image" id="icon-preview" alt="Preview of the Dock icon" hidden />
              </div>
              <p class="preview-caption" id="preview-caption">Paste an image URL to see how it looks.</p>
            </article>

            <article class="card">
              <div class="card-heading">
                <h3 class="card-title">Choose an image</h3>
                <span class="card-note">PNG, JPEG, or another macOS format</span>
              </div>
              <label for="icon-url">Image URL</label>
              <input
                class="url-input"
                id="icon-url"
                type="url"
                placeholder="https://example.com/icon.png"
                autocomplete="url"
                spellcheck="false"
              />
              <p class="hint">Use a direct link to an image. macOS checks the image data before changing the Dock icon.</p>
              <div class="actions">
                <button class="button button-primary" id="apply-icon" type="button" disabled>Apply icon</button>
                <button class="button button-secondary" id="restore-icon" type="button">Restore original</button>
              </div>
              <div class="status info" id="status" role="status" aria-live="polite">
                <span class="status-dot" aria-hidden="true"></span>
                <span id="status-message">Paste an image URL to begin.</span>
              </div>
            </article>
          </section>

          <p class="footer">The original icon comes from the app bundle.</p>
        </main>

        <script>
          const isMacOS = ${process.platform === 'darwin'};
          const input = document.getElementById('icon-url');
          const preview = document.getElementById('icon-preview');
          const previewEmpty = document.getElementById('preview-empty');
          const placeholderTitle = document.getElementById('placeholder-title');
          const previewCaption = document.getElementById('preview-caption');
          const applyButton = document.getElementById('apply-icon');
          const restoreButton = document.getElementById('restore-icon');
          const status = document.getElementById('status');
          const statusMessage = document.getElementById('status-message');
          const platformLabel = document.getElementById('platform-label');
          let previewRequest = 0;
          let previewTimer;
          let busy = false;
          let actionFeedback = false;

          function setStatus(message, tone) {
            status.className = 'status ' + tone;
            statusMessage.textContent = message;
          }

          function getImageUrl(value) {
            try {
              const url = new URL(value);
              return url.protocol === 'http:' || url.protocol === 'https:' ? url : null;
            } catch {
              return null;
            }
          }

          function updateButtons() {
            const validUrl = getImageUrl(input.value.trim()) !== null;
            const available = isMacOS && !busy;
            input.disabled = busy;
            applyButton.disabled = !available || !validUrl;
            restoreButton.disabled = !available;
          }

          function updatePreview() {
            const request = ++previewRequest;
            const value = input.value.trim();
            actionFeedback = false;
            preview.hidden = true;
            previewEmpty.hidden = false;
            placeholderTitle.textContent = 'Your preview appears here';

            if (!value) {
              previewCaption.textContent = 'Paste an image URL to see how it looks.';
              setStatus(
                isMacOS ? 'Paste an image URL to begin.' : 'Dock icon changes are available on macOS only.',
                isMacOS ? 'info' : 'warning',
              );
              updateButtons();
              return;
            }

            const url = getImageUrl(value);
            if (!url) {
              previewCaption.textContent = 'Use a complete HTTP or HTTPS image URL.';
              setStatus('Enter a valid HTTP or HTTPS image URL.', 'error');
              updateButtons();
              return;
            }

            previewCaption.textContent = 'Loading preview from ' + url.host + '…';
            setStatus('Loading image preview…', 'info');
            preview.onload = () => {
              if (request !== previewRequest) return;
              previewEmpty.hidden = true;
              preview.hidden = false;
              previewCaption.textContent = 'Preview loaded from ' + url.host + '.';
              if (!actionFeedback) setStatus('Preview ready. Apply it to update the Dock icon.', 'info');
            };
            preview.onerror = () => {
              if (request !== previewRequest) return;
              placeholderTitle.textContent = 'Preview unavailable';
              previewCaption.textContent = 'The image could not be previewed here. You can still try applying it.';
              if (!actionFeedback) setStatus('Preview unavailable. macOS will validate the image when applied.', 'warning');
            };
            preview.src = url.href;
            updateButtons();
          }

          function schedulePreviewUpdate() {
            window.clearTimeout(previewTimer);
            previewRequest += 1;
            actionFeedback = false;
            updateButtons();

            if (!input.value.trim()) {
              updatePreview();
              return;
            }

            previewCaption.textContent = 'Preview refreshes when you pause typing.';
            setStatus('Waiting for URL input…', 'info');
            previewTimer = window.setTimeout(() => {
              previewTimer = undefined;
              updatePreview();
            }, 300);
          }

          input.addEventListener('input', schedulePreviewUpdate);

          applyButton.addEventListener('click', async () => {
            const url = input.value.trim();
            if (!getImageUrl(url) || busy || !isMacOS) return;

            window.clearTimeout(previewTimer);
            previewTimer = undefined;
            updatePreview();
            busy = true;
            actionFeedback = true;
            updateButtons();
            setStatus('Downloading the image and updating the Dock…', 'info');
            try {
              await bridge.setDockIcon(url);
              setStatus('Dock icon updated successfully.', 'success');
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'Could not update the Dock icon.', 'error');
            } finally {
              busy = false;
              updateButtons();
            }
          });

          restoreButton.addEventListener('click', async () => {
            if (busy || !isMacOS) return;

            window.clearTimeout(previewTimer);
            previewTimer = undefined;
            busy = true;
            actionFeedback = true;
            updateButtons();
            setStatus('Restoring the original app icon…', 'info');
            try {
              await bridge.removeDockIcon();
              setStatus('Original Dock icon restored.', 'success');
            } catch (error) {
              setStatus(error instanceof Error ? error.message : 'Could not restore the original icon.', 'error');
            } finally {
              busy = false;
              updateButtons();
            }
          });

          if (!isMacOS) {
            platformLabel.textContent = 'macOS only';
            document.querySelector('.platform-dot').style.background = '#d49a39';
          }
          updateButtons();
        </script>
      </body>
    </html>`,
});

webview.expose('bridge', {
  async setDockIcon(url: string) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Image request failed: ${response.status} ${response.statusText}`);
    }

    const icon = Buffer.from(await response.arrayBuffer());
    app.setDockIcon(icon);
    return true;
  },
  removeDockIcon() {
    app.removeDockIcon();
    return true;
  },
});

await app.whenReady();
