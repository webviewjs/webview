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
    className = 'text-[#8e8e8e]';
  } else if (/^["'`]/.test(token)) {
    className = 'text-[#ff765e]';
  } else if (/^\d/.test(token)) {
    className = 'text-[#efc26b]';
  } else if (keywords.has(token)) {
    className = 'text-[#ff344e]';
  } else if (/^[A-Za-z_$][\w$]*$/.test(token)) {
    const next = nextSignificantToken(tokens, index);
    const previous = previousSignificantToken(tokens, index);
    const isFunctionCall = next === '(' && previous !== 'new' && !/^[A-Z]/.test(token);
    const isMethodCall = previous === '.' && next === '(';

    if (isFunctionCall || isMethodCall) className = 'text-[#4fd7c4]';
  }

  return className ? <span className={className}>{token}</span> : token;
}

export function HighlightedCode({
  source,
  lineNumbers = true,
  lineClass = 'block min-h-[1.55em] whitespace-pre',
}: {
  source: string;
  lineNumbers?: boolean;
  lineClass?: string;
}) {
  return (
    <code className="block w-max min-w-full">
      {source.split('\n').map((line, lineIndex) => {
        const tokens = line.match(tokenPattern) ?? [];

        return (
          <span className={lineClass} key={lineIndex}>
            {lineNumbers && (
              <span className="mr-[13px] inline-block w-[21px] select-none text-right text-[rgb(255_255_255_/_0.5)] max-[700px]:mr-2">
                {lineIndex + 1}
              </span>
            )}
            {tokens.map((token, tokenIndex) => (
              <span key={tokenIndex}>{renderToken(token, tokens, tokenIndex)}</span>
            ))}
          </span>
        );
      })}
    </code>
  );
}
