import { encodeGraph, encodeQuery } from '../encodeTree.js';
import { pack, unpack } from '../pack.js';

test('graph', () => {
  const original = encodeGraph(
    {
      foo: { $key: { bar: 10, $all: true } },
      users: [
        { $key: '1', name: 'Alice', settings: { $val: ['hi'] } },
        { $key: '2', name: 'Bob', manager: { $ref: 'users.1' }, foo: null },
      ],
      baz: {
        $put: true,
        gah: 256,
      },
      buz: {
        $put: { $before: 'zoo' },
        gab: 44,
      },
    },
    100,
  );

  const packed = pack(original);
  const unpacked = unpack(packed);
  expect(unpacked).toEqual(original);
});

test('query', () => {
  const original = encodeQuery(
    {
      postCount: 1,
      posts: {
        $key: { $first: 10, $since: '1984' },
        title: 1,
        body: 1,
        author: { name: 1 },
      },
      tags: { $key: { $first: 10 } },
      reactions: { $key: { $last: 100 } },
    },
    0,
  );

  const packed = pack(original);
  const unpacked = unpack(packed);
  expect(unpacked).toEqual(original);
});
