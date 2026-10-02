import type { ReactNode } from 'react';

const keywords = new Set([
  'as',
  'async',
  'await',
  'class',
  'const',
  'export',
  'from',
  'function',
  'import',
  'let',
  'new',
  'return',
  'throw',
  'var',
  'void',
]);

const tokenPattern =
  /\/\/.*$|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|[A-Za-z_$][\w$]*|\s+|./g;
const lineClass = 'code-line';
const numberClass = 'code-number';

function nextSignificantToken(tokens: string[], index: number) {
  return tokens.slice(index + 1).find((token) => !/^\s+$/.test(token));
}

function previousSignificantToken(tokens: string[], index: number) {
  return tokens
    .slice(0, index)
    .reverse()
    .find((token) => !/^\s+$/.test(token));
}

function renderToken(token: string, tokens: string[], index: number): ReactNode {
  let className: string | undefined;

  if (token.startsWith('//')) {
    className = 'code-comment';
  } else if (/^["'`]/.test(token)) {
    className = 'code-string';
  } else if (/^\d/.test(token)) {
    className = 'code-number-value';
  } else if (keywords.has(token)) {
    className = 'code-keyword';
  } else if (/^[A-Za-z_$][\w$]*$/.test(token)) {
    const next = nextSignificantToken(tokens, index);
    const previous = previousSignificantToken(tokens, index);
    const isFunctionCall = next === '(' && previous !== 'new' && !/^[A-Z]/.test(token);
    const isMethodCall = previous === '.' && next === '(';

    if (isFunctionCall || isMethodCall) className = 'code-accent';
  }

  return className ? <span className={className}>{token}</span> : token;
}

export function HighlightedCode({ source, lineNumbers = true }: { source: string; lineNumbers?: boolean }) {
  return (
    <code>
      {source.split('\n').map((line, lineIndex) => {
        const tokens = line.match(tokenPattern) ?? [];

        return (
          <span className={lineClass} key={lineIndex}>
            {lineNumbers && <span className={numberClass}>{lineIndex + 1}</span>}
            {tokens.map((token, tokenIndex) => (
              <span key={tokenIndex}>{renderToken(token, tokens, tokenIndex)}</span>
            ))}
          </span>
        );
      })}
    </code>
  );
}
