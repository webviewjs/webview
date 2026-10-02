import { HighlightedCode } from './highlighted-code';

const tracks = [
  {
    label: 'Native window events',
    kind: 'native',
    events: ['Input', 'Resize', 'Focus', 'Pointer'],
  },
  {
    label: 'Async JavaScript',
    kind: 'javascript',
    events: ['Timers', 'Promises', 'fetch', 'Background work'],
  },
];

const code = [
  "import { Application } from '@webviewjs/webview';",
  '',
  'const app = new Application();',
  "app.createBrowserWindow({ title: 'My App' });",
  '',
  'setInterval(() => {',
  "  console.log('still running');",
  '}, 1000);',
  '',
  "const response = await fetch('https://example.com');",
  'console.log(response.status);',
  '',
  'app.run();',
].join('\n');

export function EventLoopIntegration() {
  return (
    <section className="home-section javascript-section event-loop-section" aria-labelledby="event-loop-title">
      <div className="home-container">
        <div className="home-section-heading">
          <h2 className="home-section-title" id="event-loop-title">
            Async code
            <br />
            keeps running<span>.</span>
          </h2>
          <p>
            WebviewJS pumps native window events without blocking JavaScript. Timers, promises, fetch requests, and
            background work keep running while your app is open.
          </p>
        </div>
        <div className="event-loop-showcase">
          <div
            className="event-loop-diagram"
            role="img"
            aria-label="Native window events and asynchronous JavaScript progress concurrently. Window events are processed without taking over JavaScript."
          >
            <div className="event-loop-diagram-toolbar">
              <strong>Non-blocking event loop</strong>
              <span>
                <i aria-hidden="true">→</i>
              </span>
            </div>
            <div className="event-loop-tracks">
              {tracks.map(({ label, kind, events }) => (
                <div className={'event-loop-track event-loop-track--' + kind} key={kind}>
                  <strong className="event-loop-track-label">{label}</strong>
                  <div className="event-loop-track-events">
                    {events.map((event, index) => (
                      <span className="event-loop-track-event" key={event + index}>
                        <i aria-hidden="true" />
                        <span>{event}</span>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="event-loop-statuses">
              <div className="event-loop-status">
                <span className="event-loop-status-copy">
                  <strong>No blocking run loop</strong>
                  <span>Window events are processed without taking over JavaScript.</span>
                </span>
              </div>
            </div>
          </div>
          <div className="event-loop-code">
            <div className="event-loop-code-toolbar">
              <span>main.ts</span>
              <span>NODE · DENO · BUN</span>
            </div>
            <pre aria-label="JavaScript example with a responsive native window and continuing async work">
              <HighlightedCode source={code} lineNumbers={false} />
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}
