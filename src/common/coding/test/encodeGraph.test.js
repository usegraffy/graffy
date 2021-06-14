import { encodeGraph } from '../encodeTree.js';

test('simple', () => {
  const users = [
    { $key: '1', name: 'Alice', settings: { $val: ['hi'] } },
    { $key: '2', name: 'Bob', manager: { $ref: 'users.1' }, foo: null },
  ];

  const posts = [];
  const tags = { a: true, b: true };
  const version = 0;

  expect(encodeGraph({ users, posts, tags }, version)).toEqual([
    {
      key: 'tags',
      version,
      children: [
        { key: 'a', value: true, version },
        { key: 'b', value: true, version },
      ],
    },
    {
      key: 'users',
      version,
      children: [
        {
          key: '1',
          version,
          children: [
            { key: 'name', value: 'Alice', version },
            { key: 'settings', value: ['hi'], version },
          ],
        },
        {
          key: '2',
          version,
          children: [
            { key: 'foo', end: 'foo', version },
            { key: 'manager', path: ['users', '1'], version },
            { key: 'name', value: 'Bob', version },
          ],
        },
      ],
    },
  ]);
});

test('point_deletion', () => {
  const version = 0;
  expect(encodeGraph({ foo: null }, version)).toEqual([
    { key: 'foo', end: 'foo', version },
  ]);
});

test('point_in_range_deletion', () => {
  const version = 0;
  expect(encodeGraph([{ $key: { $cursor: ['foo'] } }], version)).toEqual([
    { key: '\x000VKaQqw', end: '\x000VKaQqw', version },
  ]);
});

test('plain_range', () => {
  expect(encodeGraph({ $put: { $before: ['a'] } }, 0)).toEqual([
    { key: '', end: '\x000VKV\uffff', version: 0 },
  ]);
});

test('arrayCursor.encode', () => {
  expect(encodeGraph([{ $key: [23], $val: 25 }], 0)).toEqual([
    { key: '\x000VI-Ck--------', value: 25, version: 0 },
  ]);
});

test('bounded_range', () => {
  const result = encodeGraph({ $put: { $after: ['a'], $before: ['b'] } }, 0);
  expect(result).toEqual([
    { key: '\x000VKW\0', end: '\x000VKW\uffff', version: 0 },
  ]);
});

test('put_true', () => {
  const result = encodeGraph({ foo: 3, $put: true }, 0);
  expect(result).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 3, version: 0 },
    { key: 'foo\0', end: '\uffff', version: 0 },
  ]);
});

test('put_partial', () => {
  const result = encodeGraph({ foo: 3, $put: [{ $until: 'goo' }] }, 0);
  expect(result).toEqual([
    { key: '', end: 'fon\uffff', version: 0 },
    { key: 'foo', value: 3, version: 0 },
    { key: 'foo\0', end: 'goo', version: 0 },
  ]);
});

test('empty', () => {
  const result = encodeGraph({ foo: {} }, 0);
  expect(result).toEqual([]);
});

test('empty2', () => {
  const result = encodeGraph({}, 0);
  expect(result).toEqual([]);
});

test('empty3', () => {
  const result = encodeGraph(undefined, 0);
  expect(result).toEqual([]);
});

test('plain_array', () => {
  const result = encodeGraph(['js', 'css'], 0);
  expect(result).toEqual([
    { key: '\x0007----------', value: 'js', version: 0 },
    { key: '\x0007----------\0', end: '\x000Azk-------,\uffff', version: 0 },
    { key: '\x000Azk--------', value: 'css', version: 0 },
    { key: '\x000Azk--------\0', end: '\x000Ezk--------', version: 0 },
  ]);
});

test('refWithProperties', () => {
  const result = encodeGraph({ foo: { $ref: ['bar'], baz: 42 } }, 0);

  expect(result).toEqual([
    {
      key: 'bar',
      children: [{ key: 'baz', value: 42, version: 0 }],
      version: 0,
    },
    { key: 'foo', path: ['bar'], version: 0 },
  ]);
});

test('refWithValue', () => {
  const result = encodeGraph({ foo: { $ref: ['bar'], $val: 42 } }, 0);

  expect(result).toEqual([
    { key: 'bar', value: 42, version: 0 },
    { key: 'foo', path: ['bar'], version: 0 },
  ]);
});

test('rangeRef', () => {
  const result = encodeGraph(
    {
      foo: [
        {
          $key: { $all: true, tag: 'x' },
          $ref: ['bar', { $all: true, tag: 'x', id: 'y' }],
        },
      ],
    },
    0,
  );
  // console.log(JSON.stringify(result));
  expect(result).toEqual([
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
});

test('rangeRefChi', () => {
  const result = encodeGraph(
    [
      {
        $key: { tag: 'x', $first: 2 },
        $chi: [
          { $key: { i: 1 }, foo: 1 },
          { $key: { i: 2 }, foo: 2 },
        ],
      },
    ],
    0,
  );
  expect(result).toEqual([
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
  ]);
});

test('rangeRefCursor1', () => {
  const result = encodeGraph(
    [
      {
        $key: { tag: 'x', $first: 2 },
        $chi: [
          { $key: { i: 1 }, foo: 1 },
          { $key: { i: 2 }, foo: 2 },
        ],
      },
    ],
    0,
  );

  const expected = [
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
  ];

  expect(result).toEqual(expected);
});

test('rangeRefCursor2', () => {
  const arr = [
    { $key: { tag: 'x', $cursor: { i: 1 } }, foo: 1 },
    { $key: { tag: 'x', $cursor: { i: 2 } }, foo: 2 },
  ];

  const result = encodeGraph(arr, 0);
  const expected = [
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
  ];

  expect(result).toEqual(expected);
});

test('emptyString', () => {
  expect(encodeGraph({ $key: '', $val: 4 }, 0)).toEqual([
    { key: '', version: 0, value: 4 },
  ]);
});
