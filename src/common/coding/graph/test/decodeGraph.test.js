import decodeGraph from '../decode.js';
import { encodeValue as key, keyAfter, keyBefore } from '@graffy/common';

test('decodeGraph', () => {
  const decodeGraphd = decodeGraph(
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
        { key: '\0' + key('1984'), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '1'] },
          { key: 'body', value: 'Lorem ipsum', version: 2 },
          { key: 'options', value: { inStock: true }, version: 2 },
          { key: 'title', value: '1984', version: 2 },
        ] },
        { key: '\0' + keyAfter(key('1984')), end: '\0' + keyBefore(key('2001')), version: 2},
        { key: '\0' + key('2001'), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '2'] },
          { key: 'body', value: 'Hello world', version: 2 },
          { key: 'options', value: { borrowed: true }, version: 2 },
          { key: 'title', value: '2001', version: 2 },
        ] },
        { key: '\0' + keyAfter(key('2001')), end: '\0\uffff', version: 2 }
      ] },
    ],
  );
  expect(decodeGraphd).toEqual({
    users: {
      1: { $ref: ['users', '1'], name: 'George Orwell' },
      2: { $ref: ['users', '2'], name: 'Arthur C Clarke' },
    },
    posts: [
      {
        $key: '1984',
        title: '1984',
        body: 'Lorem ipsum',
        options: { $val: { inStock: true } },
        author: { $ref: ['users', '1'], name: 'George Orwell' },
      },
      {
        $key: '2001',
        title: '2001',
        body: 'Hello world',
        options: { $val: { borrowed: true } },
        author: { $ref: ['users', '2'], name: 'Arthur C Clarke' },
      },
    ],
  });

  expect(decodeGraphd.posts[0].author).toBe(decodeGraphd.users['1']);
  expect(decodeGraphd.posts[1].author).toBe(decodeGraphd.users['2']);
});

// TODO: Test multi-hop links and loops.

test('arrayCursor.decode', () => {
  expect(
    decodeGraph([{ key: '\x000VI-Ck--------', value: 25, version: 0 }]),
  ).toEqual([25]);
});

describe('pagination', () => {
  test('backward_mid', () => {
    expect(
      decodeGraph(
        [
          { key: 'foo', value: '123', version: 1 },
          { key: 'foo\0', end: '\uffff', version: 1 },
        ],
        [{ $key: { first: 10, since: 'foo' }, name: 1 }],
      ).prevPage,
    ).toEqual({ last: 10, before: 'foo' });
  });

  test('forward_end', () => {
    expect(
      decodeGraph(
        [
          { key: 'foo', value: '123', version: 1 },
          { key: 'foo\0', end: '\uffff', version: 1 },
        ],
        [{ $key: { first: 10, since: 'foo' }, name: 1 }],
      ).nextPage,
    ).toBe(undefined);
  });

  test('backward_start', () => {
    expect(
      decodeGraph(
        [
          { key: '', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: '123', version: 1 },
        ],
        [{ $key: { last: 10, until: 'foo' }, name: 1 }],
      ).prevPage,
    ).toBe(undefined);
  });

  test('forward_end', () => {
    expect(
      decodeGraph(
        [
          { key: '', end: 'fon\uffff', version: 1 },
          { key: 'foo', value: '123', version: 1 },
        ],
        [{ $key: { last: 10, until: 'foo' }, name: 1 }],
      ).nextPage,
    ).toEqual({ first: 10, after: 'foo' });
  });
});
