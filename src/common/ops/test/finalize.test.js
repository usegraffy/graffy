import { e } from '@graffy/testing/encoder.js';
import { MAX_KEY, MIN_KEY } from '../../util.js';
import { keyAfter as aft, keyBefore as bef } from '../step.js';

import finalize from '../finalize';

test('prefix-regression', () => {
  expect(
    finalize(
      [
        {
          key: e.users,
          version: 0,
          children: [
            {
              key: MIN_KEY,
              version: 0,
              children: [
                {
                  key: e['0VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ'],
                  version: 0,
                  path: [e.users, e['f77cecc8-fac5-46c5-a277-4d470f9354f9']],
                },
              ],
              prefix: true,
            },
            {
              key: e['f77cecc8-fac5-46c5-a277-4d470f9354f9'],
              version: 0,
              children: [{ key: e.name, version: 0, value: 'A' }],
            },
          ],
        },
      ],
      [
        {
          key: e.users,
          version: 0,
          children: [
            {
              key: MIN_KEY,
              end: MAX_KEY,
              version: 0,
              children: [{ key: e.name, version: 0, value: 1 }],
            },
          ],
        },
      ],
      0,
    ),
  ).toEqual([
    {
      key: e.users,
      version: 0,
      children: [
        {
          key: MIN_KEY,
          version: 0,
          children: [
            {
              key: MIN_KEY,
              end: bef(
                e['0VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ'],
              ),
              version: 0,
            },
            {
              key: e['0VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ'],
              version: 0,
              path: [e.users, e['f77cecc8-fac5-46c5-a277-4d470f9354f9']],
            },
            {
              key: aft(
                e['0VJsOL7rD24WOXpYDL4aAIGaCLBhDL3tOXorCI4WBaNkCa8ZCIZ'],
              ),
              end: MAX_KEY,
              version: 0,
            },
          ],
          prefix: true,
        },
        {
          key: e['f77cecc8-fac5-46c5-a277-4d470f9354f9'],
          version: 0,
          children: [{ key: e.name, version: 0, value: 'A' }],
        },
      ],
    },
  ]);
});
