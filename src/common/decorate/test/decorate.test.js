import decorate from '../decorate';
import { key, keyAfter, keyBefore } from '@graffy/common';

test('decorate', () => {
  const decorated = decorate(
    /* prettier-ignore */
    [
      { key: 'users', version: 2, children: [
        { key: '1', version: 2, children: [
          { key: 'name', value: 'George Orwell', version: 2 },
        ] },
        { key: '2', version: 2, children: [
          { key: 'name', value: 'Arthur C Clarke', version: 2 },
        ]}
      ] },
      { key: 'posts', version: 2, children: [
        { key: key('1984'), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '1'] },
          { key: 'body', value: 'Lorem ipsum', version: 2 },
          { key: 'options', value: { inStock: true }, version: 2 },
          { key: 'title', value: '1984', version: 2 },
        ] },
        { key: keyAfter(key('1984')), end: keyBefore(key('2001')), version: 2},
        { key: key('2001'), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '2'] },
          { key: 'body', value: 'Hello world', version: 2 },
          { key: 'options', value: { borrowed: true }, version: 2 },
          { key: 'title', value: '2001', version: 2 },
        ] },
        { key: keyAfter(key('2001')), end: '\uffff', version: 2 }
      ] },
    ],
  );
  expect(decorated).toEqual({
    users: {
      1: { name: 'George Orwell' },
      2: { name: 'Arthur C Clarke' },
    },
    posts: [
      {
        title: '1984',
        body: 'Lorem ipsum',
        options: { inStock: true },
        author: { name: 'George Orwell' },
      },
      {
        title: '2001',
        body: 'Hello world',
        options: { borrowed: true },
        author: { name: 'Arthur C Clarke' },
      },
    ],
  });

  expect(decorated.posts[0].author).toBe(decorated.users['1']);
  expect(decorated.posts[1].author).toBe(decorated.users['2']);
});

// TODO: Test multi-hop links and loops.
