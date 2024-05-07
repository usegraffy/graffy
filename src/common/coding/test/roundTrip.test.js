import {
  decodeGraph,
  decodeQuery,
  encodeGraph,
  encodeQuery,
} from '../index.js';

import { keyref, put } from '@graffy/testing';

describe('graph', () => {
  function roundTrip(original, expected = original, callback = null) {
    const encoded = encodeGraph(original, 10);
    const decoded = decodeGraph(encoded);
    expect(decoded).toEqual(expected);
    const reencoded = encodeGraph(decoded, 10);
    expect(reencoded).toEqual(encoded);
    if (callback) callback(decoded);
  }

  test('cursor', () => {
    roundTrip([
      {
        $key: { $order: ['id'], $cursor: [123] },
        name: 'Alice',
      },
    ]);
  });

  test('simple', () => {
    const users = [
      { $key: '1', name: 'Alice', settings: { $val: ['hi'] } },
      { $key: '2', name: 'Bob', manager: { $ref: 'users.1' }, foo: null },
    ];

    const expectedUsers = {
      1: { name: 'Alice', settings: ['hi'] },
      2: { name: 'Bob', manager: {}, foo: null },
    };

    const posts = [];
    const tags = { a: true, b: true };

    roundTrip(
      { users, posts, tags },
      { users: expectedUsers, tags },
      (decoded) => {
        expect(decoded.users['2'].manager.$ref).toEqual(['users', '1']);
        expect(decoded.users['1'].settings.$val).toBe(true);
      },
    );
  });

  test('skipped_array', () => {
    roundTrip(
      { foo: { $key: { email: 'a' }, name: 'x' } },
      { foo: [{ $key: { email: 'a' }, name: 'x' }] },
    );
  });

  test('val_null', () => {
    roundTrip({ foo: { $val: null } });
  });

  test('val_scalar', () => {
    roundTrip({ foo: { $val: 42 } }, { foo: 42 });
  });

  test('val_object', () => {
    roundTrip(
      { foo: { $val: true, bar: 20 } },
      { foo: { bar: 20 } },
      (decoded) => {
        expect(decoded.foo.$val).toBe(true);
      },
    );
  });

  test('val_object_2', () => {
    roundTrip(
      { foo: { $val: { bar: 20 } } },
      { foo: { bar: 20 } },
      (decoded) => {
        expect(decoded.foo.$val).toBe(true);
      },
    );
  });

  test('val_array', () => {
    /** @type number[] & { $val?: true } */
    const array = [1, 2, 3];
    array.$val = true;
    roundTrip({ foo: array }, { foo: [1, 2, 3] }, (decoded) => {
      expect(decoded.foo.$val).toBe(true);
    });
  });

  test('val_array_2', () => {
    roundTrip({ foo: { $val: [1, 2, 3] } }, { foo: [1, 2, 3] }, (decoded) => {
      expect(decoded.foo.$val).toBe(true);
    });
  });

  test('point_deletion', () => {
    roundTrip({ foo: null });
  });

  test('point_in_range_deletion', () => {
    roundTrip([{ $key: { $cursor: ['foo'] } }]);
  });

  test('plain_range', () => {
    roundTrip({ $put: { $before: ['a'] } }, {}, (decoded) => {
      expect(decoded.$put).toEqual([{ $before: ['a'] }]);
    });
  });

  test('arrayCursor.encode', () => {
    roundTrip([{ $key: [23], $val: 25 }]);
  });

  test('bounded_range', () => {
    roundTrip({ $put: { $after: ['a'], $before: ['b'] } }, {}, (decoded) => {
      expect(decoded.$put).toEqual([{ $after: ['a'], $before: ['b'] }]);
    });
  });

  test('put_true', () => {
    roundTrip({ foo: 3, $put: true }, { foo: 3 }, (decoded) => {
      expect(decoded.$put).toBe(true);
    });
  });

  test('put_partial', () => {
    roundTrip({ foo: 3, $put: [{ $until: 'goo' }] }, { foo: 3 }, (decoded) => {
      expect(decoded.$put).toEqual([{ $until: 'goo' }]);
    });
  });

  test('empty', () => {
    roundTrip({ foo: {} }, {});
  });

  test('empty2', () => {
    roundTrip({});
  });

  test('empty3', () => {
    roundTrip(undefined, {});
  });

  test('plain_array', () => {
    roundTrip(['js', 'css']);
  });

  test('array_update', () => {
    roundTrip([{ $key: 0, $val: 'ts' }]);
  });

  test('refWithProperties', () => {
    roundTrip(
      { foo: { $ref: ['bar'], baz: 42 } },
      { foo: {}, bar: { baz: 42 } },
      (dec) => {
        expect(dec.foo.$ref).toEqual(['bar']);
      },
    );
  });

  test('refWithValue', () => {
    roundTrip(
      { foo: { $ref: ['bar'], $val: 42 } },
      { foo: {}, bar: 42 },
      (dec) => {
        expect(dec.foo.$ref).toEqual(['bar']);
      },
    );
  });

  test('rangeRef', () => {
    roundTrip(
      {
        foo: [
          {
            $key: { $all: true, tag: 'x' },
            $ref: ['bar', { $all: true, tag: 'x', id: 'y' }],
          },
        ],
      },
      { foo: [{ $key: { $all: true, tag: 'x' } }] },
      (decoded) =>
        expect(decoded.foo[0].$ref).toEqual([
          'bar',
          { $all: true, tag: 'x', id: 'y' },
        ]),
    );
  });

  test('rangeWithChi', () => {
    roundTrip(
      [
        {
          $key: { tag: 'x', $first: 2 },
          $chi: [
            { $key: { i: 1 }, foo: 1 },
            { $key: { i: 2 }, foo: 2 },
          ],
        },
      ],
      [
        { $key: { tag: 'x', $cursor: { i: 1 } }, foo: 1 },
        { $key: { tag: 'x', $cursor: { i: 2 } }, foo: 2 },
      ],
    );
  });

  test('rangeWithCursor', () => {
    const arr = [
      { $key: { tag: 'x', $cursor: { i: 1 } }, foo: 1 },
      { $key: { tag: 'x', $cursor: { i: 2 } }, foo: 2 },
    ];

    roundTrip(arr);
  });

  test('emptyString', () => {
    roundTrip({ $key: '', $val: 4 }, { '': 4 });
  });

  test('ranges', () => {
    roundTrip({ foo: [{ $key: { $until: 'a' } }] }, { foo: {} }, (decoded) => {
      expect(decoded.foo.$put).toEqual([{ $until: 'a' }]);
    });
  });

  test('emptyNestedObjects', () => {
    roundTrip({ foo: { bar: { baz: {} } } }, {});
  });

  test('cursor_only', () => {
    roundTrip([{ $key: { $cursor: ['a'] }, name: 'A' }]);
  });

  const original1 = {
    tenant: put(
      [
        {
          id: 'bar',
          name: 'Bar',
          $key: 'bar',
        },
        {
          id: 'foo',
          name: 'Foo',
          $key: 'foo',
        },
        keyref({ $order: ['id'], $cursor: ['bar'] }, ['tenant', 'bar']),
        keyref({ $order: ['id'], $cursor: ['foo'] }, ['tenant', 'foo']),

        // {
        //   $key: { $order: ['id'], $cursor: ['foo'] },
        //   $ref: ['tenant', 'foo'],
        // },
      ],
      [{ $order: ['id'], $all: true }],
    ),
  };

  const original2 = {
    tenant: [
      {
        id: 'foo',
        name: 'Foo',
        $key: 'foo',
      },
      {
        id: 'bar',
        name: 'Bar',
        $key: 'bar',
      },
      {
        $key: { $order: ['id'], $all: true },
        $chi: [
          { $key: ['foo'], $ref: ['tenant', 'foo'] },
          { $key: ['bar'], $ref: ['tenant', 'bar'] },
        ],
      },
    ],
  };

  test('mix1', () => {
    roundTrip(original1, original1, (decoded) => {
      expect(decoded.tenant[2].$ref).toEqual(['tenant', 'bar']);
      expect(decoded.tenant[3].$ref).toEqual(['tenant', 'foo']);
    });
    // const encoded = encodeGraph(original1, 1);
    // console.log(encoded);
    // const decoded = decodeGraph(encoded);
    // console.log(decoded);
  });

  test('mix2', () => {
    roundTrip(original2, original1, (decoded) => {
      expect(decoded.tenant[2].$ref).toEqual(['tenant', 'bar']);
      expect(decoded.tenant[3].$ref).toEqual(['tenant', 'foo']);
    });

    // const encoded = encodeGraph(original2, 0);
    // console.log(encoded);
    // const decoded = decodeGraph(encoded);
    // console.log(decoded);
  });

  test('nested_empty_object', () => {
    roundTrip(
      {
        person: [
          {
            $key: { example: 'filter', $cursor: ['something'] },
            $ref: ['person', 'exampleId'],
            domains: {},
          },
        ],
      },
      {
        person: [
          {
            $key: { example: 'filter', $cursor: ['something'] },
          },
        ],
      },
      (decoded) =>
        expect(decoded.person[0].$ref).toEqual(['person', 'exampleId']),
    );
  });

  test('simple_cube', () => {
    roundTrip([
      {
        $key: { $order: ['id'], $cursor: [123] },
        name: 'Alice',
        quantities: [100000, 75000, 0],
      },
    ]);
  });
});

describe('query', () => {
  function roundTrip(original, expected = original, callback = null) {
    const encoded = encodeQuery(original);
    const decoded = decodeQuery(encoded);
    expect(decoded).toEqual(expected);
    if (callback) callback(decoded);
  }

  test('firstN', () => {
    roundTrip([{ $key: { $order: ['id'], $first: 3 }, name: true }]);
  });

  test('sink', () => {
    roundTrip(
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
      {
        postCount: true,
        posts: [
          {
            $key: { $first: 10, $since: '1984' },
            title: true,
            body: true,
            author: { name: true },
          },
        ],
        tags: [{ $key: { $first: 10 } }],
        reactions: [{ $key: { $last: 100 } }],
      },
    );
  });

  test('rangeRef1', () => {
    roundTrip({ foo: [{ $key: { $all: true, tag: 'x' } }] });
  });

  test('rangeRef2', () => {
    roundTrip(
      { foo: { $key: { $all: true, tag: 'x' } } },
      { foo: [{ $key: { $all: true, tag: 'x' } }] },
    );
  });

  describe('alias', () => {
    test('simple', () => {
      roundTrip({ foo: { $ref: ['bar'] } }, { bar: true });
    });

    test('children', () => {
      roundTrip({ foo: { $ref: ['bar'], x: true } }, { bar: { x: true } });
    });

    test('range', () => {
      roundTrip(
        { foo: { $ref: ['bar', { $first: 4, t: '3' }], x: true } },
        { bar: [{ $key: { $first: 4, t: '3' }, x: true }] },
      );
    });

    test('emptyNestedObjects', () => {
      roundTrip({ foo: { bar: { baz: {} } } }, {});
    });
  });
});
