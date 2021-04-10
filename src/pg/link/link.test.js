import { encodeGraph } from '@graffy/common';
import { linkResult } from './index.js';

test('outward', () => {
  const object = { id: 'post1', authorId: 'user1' };
  const links = { author: { prop: 'authorId', target: 'users' } };
  const idProp = 'id';
  expect(linkResult([object], [], { links, idProp })).toEqual([
    {
      id: 'post1',
      authorId: 'user1',
      author: { $ref: ['users', 'user1'] },
    },
  ]);
});

test('inward', () => {
  const object = { id: 'user1' };
  const links = { posts: { target: 'posts', back: 'authorId' } };
  const idProp = 'id';

  const query = encodeGraph({
    posts: [
      {
        $key: { first: 10 },
      },
    ],
  });
  expect(linkResult([object], query, { links, idProp })).toEqual([
    {
      id: 'user1',
      posts: [
        {
          $key: { first: 10 },
          $ref: ['posts', { authorId: 'user1', first: 10 }],
        },
      ],
    },
  ]);
});
