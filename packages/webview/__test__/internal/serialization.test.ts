import { createRequire } from 'node:module';
import { expect, test } from 'bun:test';

const require = createRequire(import.meta.url);
const { SerializationError } = require('../../dist/errors/serialization-error.js');
const { serializeJson, validateJsonValue } = require('../../dist/internal/ipc/serialization.js');

test('serialization accepts JSON values and returns compact JSON', () => {
  const value = { answer: 42, nested: [true, null, 'text'] };
  expect(serializeJson(value, 'value')).toBe('{"answer":42,"nested":[true,null,"text"]}');
  expect(() => validateJsonValue(value, 'value')).not.toThrow();
});

test('serialization rejects cycles, bigint, undefined, and non-JSON values', () => {
  const circular = {};
  circular.self = circular;
  for (const value of [circular, 1n, undefined, () => 1]) {
    expect(() => serializeJson(value, 'test value')).toThrow(SerializationError);
    expect(() => validateJsonValue(value, 'test value')).toThrow(SerializationError);
  }
});
