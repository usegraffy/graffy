import assert from 'node:assert/strict';
import { test } from 'node:test';
import { e } from '@graffy/testing/encoder.ts';
import getKnown from '../getKnown.ts';

test('getKnown', () => {
  assert.deepStrictEqual(
    getKnown([
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 255, version: 3 },
          { key: e.bat, end: e.baw, version: 3 },
          { key: e.baz, end: e.baz, version: 4 },
        ],
        version: 0,
      },
    ]),
    [
      {
        key: e.foo,
        children: [
          { key: e.bar, value: 1, version: 0 },
          { key: e.bat, end: e.baw, value: 1, version: 0 },
          { key: e.baz, value: 1, version: 0 },
        ],
        version: 0,
      },
    ],
  );
});
