import { encodeQuery } from '@graffy/common';
import { linkResult } from './index.js';

test('outward', () => {
  const object = { id: 'post1', authorId: 'user1' };
  const query = encodeQuery({ author: { name: true } });
  const links = { author: ['users', '$$authorId'] };
  const expQuery = { users: { user1: { name: 1 } } };
  const expObject = {
    id: 'post1',
    authorId: 'user1',
    author: { $ref: ['users', 'user1'] },
  };

  const resQuery = linkResult([object], query, { links });

  expect(resQuery).toEqual(encodeQuery(expQuery, 0));
  expect(object).toEqual(expObject);
});

test('inward', () => {
  const object = { id: 'user1' };
  const links = { posts: ['posts', { authorId: '$$id', $all: true }] };
  const query = encodeQuery({ posts: [{ $key: { $first: 10 }, title: 1 }] });

  const expQuery = {
    posts: { $key: { authorId: 'user1', $first: 10 }, title: 1 },
  };
  const expObject = {
    id: 'user1',
    posts: { $ref: ['posts', { authorId: 'user1', $first: 10 }] },
  };

  const resQuery = linkResult([object], query, { links });
  expect(resQuery).toEqual(encodeQuery(expQuery, 0));
  expect(object).toEqual(expObject);
});
