import { encodeGraph } from '../encodeTree.js';
import { encode as encodeString } from '../string.js';
import { decode as b64decode } from '../base64.js';
import { MAX_KEY, MIN_KEY } from '../../util.js';

/** @type {Record<string, any>} */
const e = new Proxy(
  {},
  {
    get: (_target, prop) => {
      const stringifyDescriptor = {
        value: function () {
          return prop;
        },
      };

      const uarr = new Uint8Array([5, ...encodeString(prop)]);
      Object.defineProperties(uarr, {
        toJSON: stringifyDescriptor,
        toString: stringifyDescriptor,
      });
      return uarr;
    },
  },
);

const d = (str) => b64decode(str.slice(1));

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
      key: e.tags,
      version,
      children: [
        { key: e.a, value: true, version },
        { key: e.b, value: true, version },
      ],
    },
    {
      key: e.users,
      version,
      children: [
        {
          key: e['1'],
          version,
          children: [
            { key: e.name, value: 'Alice', version },
            { key: e.settings, value: ['hi'], version },
          ],
        },
        {
          key: e['2'],
          version,
          children: [
            { key: e.foo, end: 'foo', version },
            { key: e.manager, path: ['users', '1'], version },
            { key: e.name, value: 'Bob', version },
          ],
        },
      ],
    },
  ]);
});

test('skipped_array', () => {
  const version = 0;
  expect(
    encodeGraph({ foo: { $key: { email: 'a' }, name: 'x' } }, version),
  ).toEqual([
    {
      key: e.foo,
      version,
      children: [
        {
          key: d('0kK_QL4dQ--4NF'),
          version,
          children: [
            {
              key: e.name,
              version,
              value: 'x',
            },
          ],
        },
      ],
    },
  ]);
});

test('point_deletion', () => {
  const version = 0;
  expect(encodeGraph({ foo: null }, version)).toEqual([
    { key: e.foo, end: 'foo', version },
  ]);
});

test('point_in_range_deletion', () => {
  const version = 0;
  expect(encodeGraph([{ $key: { $cursor: ['foo'] } }], version)).toEqual([
    {
      key: MIN_KEY,
      version,
      prefix: true,
      children: [{ key: d('0VKaQqw'), end: d('0VKaQqw'), version }],
    },
  ]);
});

test('plain_range', () => {
  expect(encodeGraph({ $put: { $before: ['a'] } }, 0)).toEqual([
    { key: MIN_KEY, end: d('0VKV\uffff'), version: 0 },
  ]);
});

test('arrayCursor.encode', () => {
  expect(encodeGraph([{ $key: [23], $val: 25 }], 0)).toEqual([
    { key: d('0VI-Ck'), value: 25, version: 0 },
  ]);
});

test('bounded_range', () => {
  const result = encodeGraph({ $put: { $after: ['a'], $before: ['b'] } }, 0);
  expect(result).toEqual([
    { key: d('0VKW\0'), end: d('0VKW\uffff'), version: 0 },
  ]);
});

test('put_true', () => {
  const result = encodeGraph({ foo: 3, $put: true }, 0);
  expect(result).toEqual([
    { key: MIN_KEY, end: 'fon\uffff', version: 0 },
    { key: e.foo, value: 3, version: 0 },
    { key: 'foo\0', end: MAX_KEY, version: 0 },
  ]);
});

test('put_partial', () => {
  const result = encodeGraph({ foo: 3, $put: [{ $until: 'goo' }] }, 0);
  expect(result).toEqual([
    { key: MIN_KEY, end: 'fon\uffff', version: 0 },
    { key: e.foo, value: 3, version: 0 },
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
    { key: d('07-'), value: 'js', version: 0 },
    { key: d('07-\0'), end: d('0Azj\uffff'), version: 0 },
    { key: d('0Azk'), value: 'css', version: 0 },
    { key: d('0Azk\0'), end: d('0Ezk'), version: 0 },
  ]);
});

test('array_update', () => {
  const result = encodeGraph([{ $key: 0, $val: 'ts' }], 0);
  expect(result).toEqual([{ key: d('07-'), value: 'ts', version: 0 }]);
});

test('refWithProperties', () => {
  const result = encodeGraph({ foo: { $ref: ['bar'], baz: 42 } }, 0);

  expect(result).toEqual([
    {
      key: e.bar,
      children: [{ key: e.baz, value: 42, version: 0 }],
      version: 0,
    },
    { key: e.foo, path: ['bar'], version: 0 },
  ]);
});

test('refWithValue', () => {
  const result = encodeGraph({ foo: { $ref: ['bar'], $val: 42 } }, 0);

  expect(result).toEqual([
    { key: e.bar, value: 42, version: 0 },
    { key: e.foo, path: ['bar'], version: 0 },
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
  // consolkey: e.log(JSON.stringify(result));
  expect(result).toEqual([
    {
      key: e.foo,
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
        // Planned; not yet implemented
        // { key: MIN_KEY, end: '\u00000kKd--Hzw,\uffff', version: 0 },
        {
          key: '\u00000kKd--Hzw-',
          version: 0,
          children: [{ key: e.foo, version: 0, value: 1 }],
        },
        // Planned; not yet implemented
        // {
        //   end: '\u00000kKd--I----------,\uffff',
        //   key: '\u00000kKd--Hzw---------',
        //   version: 0,
        // },
        {
          key: '\u00000kKd--I-',
          version: 0,
          children: [{ key: e.foo, version: 0, value: 2 }],
        },
      ],
      prefix: true,
    },
  ]);
});

test('rangeRefCursor', () => {
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
          key: '\u00000kKd--Hzw-',
          version: 0,
          children: [{ key: e.foo, version: 0, value: 1 }],
        },
        {
          key: '\u00000kKd--I-',
          version: 0,
          children: [{ key: e.foo, version: 0, value: 2 }],
        },
      ],
      prefix: true,
    },
  ];

  expect(result).toEqual(expected);
});

test('emptyString', () => {
  expect(encodeGraph({ $key: MIN_KEY, $val: 4 }, 0)).toEqual([
    { key: MIN_KEY, version: 0, value: 4 },
  ]);
});

test('ranges', () => {
  expect(encodeGraph({ foo: [{ $key: { $until: 'a' } }] }, 0)).toEqual([
    {
      key: 'foo',
      version: 0,
      children: [{ key: MIN_KEY, end: 'a', version: 0 }],
    },
  ]);
});

test('emptyNestedObjects', () => {
  expect(encodeGraph({ foo: { bar: { baz: {} } } }, 0)).toEqual([]);
});

test('cursor_only', () => {
  expect(encodeGraph([{ $key: { $cursor: ['a'] }, name: 'A' }], 0)).toEqual([
    {
      key: MIN_KEY,
      prefix: true,
      version: 0,
      children: [
        {
          key: d('0VKW'),
          version: 0,
          children: [{ key: e.name, version: 0, value: 'A' }],
        },
      ],
    },
  ]);
});
