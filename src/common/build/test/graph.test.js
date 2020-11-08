import makeGraph from '../graph.js';

test('simple', () => {
  const users = [
    { _key_: '1', name: 'Alice', settings: { _val_: ['hi'] } },
    { _key_: '2', name: 'Bob', manager: { _ref_: 'users.1' }, foo: null },
  ];

  const posts = [];
  const tags = { a: true, b: true };
  const version = 0;

  expect(makeGraph({ users, posts, tags }, version)).toEqual([
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
  expect(
    makeGraph(
      {
        foo: null,
      },
      version,
    ),
  ).toEqual([{ key: 'foo', end: 'foo', version }]);
});

test('point_in_range_deletion', () => {
  const version = 0;
  expect(
    makeGraph(
      [
        {
          _key_: { cursor: ['foo'] },
        },
      ],
      version,
    ),
  ).toEqual([{ key: '\x000VKaQqw', end: '\x000VKaQqw', version }]);
});

test('range', () => {
  expect(makeGraph([{ _key_: { before: ['a'] } }], 0)).toEqual([
    {
      key: '',
      end: '\x000VKV\uffff',
      version: 0,
    },
  ]);
});

test('arrayCursor.encode', () => {
  expect(makeGraph([{ _key_: [23], _val_: 25 }], 0)).toEqual([
    { key: '\x000VI-Ck--------', value: 25, version: 0 },
  ]);
});

test('bounded_range', () => {
  const result = makeGraph([{ _key_: { after: ['a'], before: ['b'] } }], 0);
  expect(result).toEqual([
    { key: '\x000VKW\0', end: '\x000VKW\uffff', version: 0 },
  ]);
});
