type Runtime = 'nodejs' | 'deno' | 'bun';

const runtimes: { name: string; runtime: Runtime }[] = [
  { name: 'Node.js', runtime: 'nodejs' },
  { name: 'Deno', runtime: 'deno' },
  { name: 'Bun', runtime: 'bun' },
];

export function RuntimeCompatibility() {
  return (
    <section className="home-section platform-section" aria-labelledby="runtime-title">
      <div className="home-container">
        <div className="home-section-heading">
          <h2 className="home-section-title" id="runtime-title">
            One API.
            <br />
            Any runtime<span>.</span>
          </h2>
          <p>
            Use the same WebviewJS API with Node.js, Deno, or Bun. Choose the runtime that fits your workflow and build
            native desktop apps the way you prefer.
          </p>
        </div>
        <div className="platform-flow" role="list" aria-label="JavaScript runtimes supported by WebviewJS">
          <div className="platform-grid">
            {runtimes.flatMap(({ name, runtime }, index) => [
              <div className="platform-card" key={runtime} role="listitem">
                <span className={'platform-mark runtime-mark runtime-mark--' + runtime}>
                  <img src={'/images/runtimes/' + runtime + '.svg'} alt="" aria-hidden="true" />
                </span>
                <span className="platform-copy">
                  <strong>{name}</strong>
                  <small>SAME API</small>
                </span>
              </div>,
              ...(index < runtimes.length - 1
                ? [
                    <span
                      className="platform-connector"
                      key={runtime + '-connector'}
                      role="presentation"
                      aria-hidden="true"
                    />,
                  ]
                : []),
            ])}
          </div>
        </div>
      </div>
    </section>
  );
}
