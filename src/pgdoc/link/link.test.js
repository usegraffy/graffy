import { makeGraph } from '@graffy/common';
import { linkResult } from './index.js';

test('outward', () => {
  const object = { ids: ['post1'], author: 'user1' };
  const links = [{ prop: ['author'], target: ['users'] }];
  expect(linkResult([object], [], links)).toEqual([
    { ids: ['post1'], author: { _ref_: ['users', 'user1'] } },
  ]);
});

test('inward', () => {
  const object = { ids: ['user1'] };
  const links = [{ prop: ['posts'], target: ['posts'], back: ['author'] }];
  const query = makeGraph({
    posts: [
      {
        _key_: { first: 10 },
      },
    ],
  });
  expect(linkResult([object], query, links)).toEqual([
    {
      ids: ['user1'],
      posts: [
        {
          _key_: { first: 10 },
          _ref_: ['posts', { author: { $in: ['user1'] }, first: 10 }],
        },
      ],
    },
  ]);
});
