import test from 'ava';

import { getWebviewVersion } from '../index';

test('webview version', (t) => {
  t.is(typeof getWebviewVersion(), 'string');
});
