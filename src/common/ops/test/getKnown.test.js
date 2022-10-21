import { e } from '@graffy/testing/encoder.js';
import getKnown from '../getKnown.js';

test('getKnown', () => {
  expect(
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
  ).toEqual([
    {
      key: e.foo,
      children: [
        { key: e.bar, value: 1, version: 0 },
        { key: e.bat, end: e.baw, value: 1, version: 0 },
        { key: e.baz, value: 1, version: 0 },
      ],
      version: 0,
    },
  ]);
});
