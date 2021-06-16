import { decodeGraph } from '../decodeTree.js';
import { encode as key } from '../struct.js';
import { keyAfter, keyBefore } from '../../ops/index.js';

test('decodeGraph', () => {
  const decodedGraph = decodeGraph(
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
        { key: '\0' + key({title: '1984'}), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '1'] },
          { key: 'body', value: 'Lorem ipsum', version: 2 },
          { key: 'options', value: { inStock: true }, version: 2 },
          { key: 'title', value: '1984', version: 2 },
        ] },
        { key: '\0' + keyAfter(key({ title: '1984' })), end: '\0' + keyBefore(key({ title: '2001' })), version: 2},
        { key: '\0' + key({ title: '2001' }), version: 2, children: [
          { key: 'author', version: 2, path: ['users', '2'] },
          { key: 'body', value: 'Hello world', version: 2 },
          { key: 'options', value: { borrowed: true }, version: 2 },
          { key: 'title', value: '2001', version: 2 },
        ] },
        { key: '\0' + keyAfter(key({ title: '2001' })), end: '\0\uffff', version: 2 }
      ] },
    ],
  );
  const expected = {
    users: {
      1: { name: 'George Orwell' },
      2: { name: 'Arthur C Clarke' },
    },
    posts: [
      {
        $key: { title: '1984' },
        title: '1984',
        body: 'Lorem ipsum',
        options: { inStock: true, $val: true },
        author: { $ref: ['users', '1'] },
      },
      {
        $key: { title: '2001' },
        title: '2001',
        body: 'Hello world',
        options: { borrowed: true, $val: true },
        author: { $ref: ['users', '2'] },
      },
    ],
  };
  expected.posts.$put = [{ $since: { title: '1984' } }];
  expect(decodedGraph.posts.$put).toEqual(expected.posts.$put);
  expect(decodedGraph).toEqual(expected);
});

test('put_true', () => {
  const result = decodeGraph([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 3, version: 0 },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
  expect(result).toEqual({ foo: 3, $put: true });
});

test('put_partial', () => {
  const result = decodeGraph([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 3, version: 0 },
    { key: 'foo\0', end: 'goo', version: 0 },
  ]);
  expect(result).toEqual({ foo: 3, $put: [{ $until: 'goo' }] });
});

test('empty', () => {
  expect(decodeGraph([])).toEqual({});
});

test('plain_array', () => {
  const result = decodeGraph([
    { key: '\x0007----------', value: 'js', version: 0 },
    { key: '\x0007----------\0', end: '\x000Azk-------,\uffff', version: 0 },
    { key: '\x000Azk--------', value: 'css', version: 0 },
    { key: '\x000Azk--------\0', end: '\x000Ezk--------', version: 0 },
  ]);
  const expected = ['js', 'css'];
  expected.$put = [{ $since: 0, $until: Infinity }];
  expect(result.$put).toEqual(expected.$put);
  expect(result).toEqual(expected);
});

test('rangeRef', () => {
  const result = decodeGraph([
    {
      key: 'foo',
      version: 0,
      children: [
        {
          key: '\u00000kKoNLR-0MV',
          version: 0,
          path: ['bar', '\u00000kKdO--4TF-4S54b--Ks'],
          prefix: true,
        },
      ],
    },
  ]);
  // console.log(JSON.stringify(result));
  expect(result).toEqual({
    foo: [
      {
        $key: { $all: true, tag: 'x' },
        $ref: ['bar', { $all: true, tag: 'x', id: 'y' }],
      },
    ],
  });
});

test('rangeRefChi', () => {
  const result = decodeGraph([
    {
      key: 'foo',
      version: 0,
      children: [
        {
          key: '\u00000kKoNLR-0MV',
          version: 0,
          children: [
            {
              key: '\u00000kKd--Hzw---------',
              version: 0,
              children: [{ key: 'foo', version: 0, value: 1 }],
            },
            {
              key: '\u00000kKd--I-----------',
              version: 0,
              children: [{ key: 'foo', version: 0, value: 2 }],
            },
          ],
          prefix: true,
        },
      ],
    },
  ]);

  const expected = {
    foo: [
      { $key: { tag: 'x', $cursor: { i: 1 } }, foo: 1 },
      { $key: { tag: 'x', $cursor: { i: 2 } }, foo: 2 },
    ],
  };

  expect(result).toEqual(expected);
});
