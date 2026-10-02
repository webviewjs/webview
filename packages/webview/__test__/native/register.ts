import { mock } from 'bun:test';
import { fileURLToPath } from 'node:url';
import * as fakeBinding from './bindings';

const packageBinding = fileURLToPath(new URL('../../js-bindings.js', import.meta.url));

mock.module(packageBinding, () => fakeBinding);
