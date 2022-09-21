import { jest } from '@jest/globals';
import Graffy from '@graffy/core';
import { encodeGraph, encodeQuery } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
import fill from './index.js';

const expectNext = async (subscription, expected, version = 0) => {
  // console.log('assert', expected);
  expect((await subscription.next()).value).toEqual(
    Array.isArray(expected) ? expected : encodeGraph(expected, version),
  );
};

describe('changes', () => {
  let g;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
    backend = mockBackend();
    backend.read = jest.fn(backend.read);
    g.use(backend.middleware);
  });

  test('simple-skipFill', async () => {
    const subscription = g.call('watch', encodeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
      skipFill: 1,
    });

    expect((await subscription.next()).value).toEqual(undefined);
    backend.write(encodeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(encodeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('simple', async () => {
    backend.write(encodeGraph({ foo: { a: 3 } }, 0));
    const subscription = g.call('watch', encodeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
    });
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(encodeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('simple-empty', async () => {
    backend.write([{ key: '', end: '\uffff', version: 0 }]);
    const subscription = g.call('watch', encodeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
    });
    await expectNext(subscription, { foo: { a: null } });
    backend.write(encodeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(encodeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('overlap', async () => {
    backend.write(encodeGraph({ foo: { a: 2 }, bar: { b: 2 } }, 0));
    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { a: 1 }, bar: { b: 1 } }, 0),
      {
        raw: true,
      },
    );

    await expectNext(subscription, { foo: { a: 2 }, bar: { b: 2 } });
    backend.write(encodeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(encodeGraph({ foo: { a: 4 } }, 0));
    await expectNext(subscription, { foo: { a: 4 } });
    backend.write(encodeGraph({ bar: { a: 7 } }, 0));
    backend.write(encodeGraph({ bar: { b: 6 } }, 0));
    await expectNext(subscription, { bar: { b: 6 } });
  });

  test('link', async () => {
    backend.write(
      encodeGraph(
        { foo: { $ref: ['bar', 'a'] }, bar: { a: { x: 3 }, b: { x: 5 } } },
        0,
      ),
    );
    const subscription = g.call('watch', encodeQuery({ foo: { x: 1 } }, 0), {
      raw: true,
    });

    await expectNext(subscription, {
      foo: { $ref: ['bar', 'a'] },
      bar: { a: { x: 3 } },
    });
    backend.write(encodeGraph({ foo: { $ref: ['bar', 'b'] } }, 0));
    await expectNext(subscription, {
      foo: { $ref: ['bar', 'b'] },
      bar: { b: { x: 5 } },
    });
    backend.write(encodeGraph({ bar: { a: { x: 7 } } })); // Should not be sent!
    backend.write(encodeGraph({ bar: { b: { x: 3 } } }, 0));
    await expectNext(subscription, { bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: { $before: ['a'] } },
            { $key: ['a'], $val: 1 },
            { $key: { $after: ['a'], $before: ['b'] } },
            { $key: ['b'], $val: 2 },
            { $key: { $after: ['b'], $before: ['c'] } },
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
            { $key: { $after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $first: 3 } } }),
      { raw: true },
    );
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['b'] } },
        { $key: ['b'], $val: 2 },
        { $key: { $after: ['b'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
      ],
    });
    backend.write(encodeGraph({ foo: [{ $key: ['b'] }] }, 1));
    await expectNext(
      subscription,
      // prettier-ignore
      { $ver: 1, foo: [
          { $key: { $since: ['b'], $until: ['b'] } },
          { $key: { $after: ['c'], $before: ['d'] }, $ver: 0 },
          { $key: ['d'], $val: 4, $ver: 0 }
        ] },
    );
  });

  test('range_insertion', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: { $before: ['a'] } },
            { $key: ['a'], $val: 1 },
            { $key: { $after: ['a'], $before: ['c'] } },
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
            { $key: { $after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $first: 3 } } }, 0),
      {
        raw: true,
      },
    );
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
        { $key: { $after: ['c'], $before: ['d'] } },
        { $key: ['d'], $val: 4 },
      ],
    });
    backend.write(encodeGraph({ foo: [{ $key: ['b'], $val: 2 }] }, 0));
    await expectNext(subscription, { foo: [{ $key: ['b'], $val: 2 }] });
  });
});

describe('values', () => {
  let g;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
    backend = mockBackend();
    backend.read = jest.fn(backend.read);
    g.use(backend.middleware);
  });

  test('object', async () => {
    backend.write(encodeGraph({ foo: { a: 3 } }, 0));
    const subscription = g.call('watch', encodeQuery({ foo: { a: 1 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(encodeGraph({ foo: { a: 4 } }, 0));
    await expectNext(subscription, { foo: { a: 4 } });
  });

  test('link', async () => {
    backend.write(encodeGraph({ bar: { a: { x: 5 }, b: { x: 6 } } }, 0));
    backend.write(encodeGraph({ foo: { $ref: ['bar', 'a'] } }, 0));

    const subscription = g.call('watch', encodeQuery({ foo: { x: 1 } }, 0));
    await expectNext(subscription, {
      foo: { $ref: ['bar', 'a'] },
      bar: { a: { x: 5 } },
    });
    backend.write(encodeGraph({ foo: { $ref: ['bar', 'b'] } }, 0));
    await expectNext(subscription, {
      foo: { $ref: ['bar', 'b'] },
      bar: { b: { x: 6 } },
    });
    backend.write(encodeGraph({ bar: { a: { x: 7 } } }, 0));
    // The /bar/a update should not be sent.
    // await subscription.next(); // TODO: Remove this!
    backend.write(encodeGraph({ bar: { b: { x: 3 } } }, 0));
    await expectNext(subscription, {
      foo: { $ref: ['bar', 'b'] },
      bar: { b: { x: 3 } },
    });
  });

  test('range_deletion', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: { $before: ['a'] } },
            { $key: ['a'], $val: 1 },
            { $key: { $after: ['a'], $before: ['b'] } },
            { $key: ['b'], $val: 2 },
            { $key: { $after: ['b'], $before: ['c'] } },
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['b'] } },
        { $key: ['b'], $val: 2 },
        { $key: { $after: ['b'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
      ],
    });
    backend.write(encodeGraph({ foo: [{ $key: ['b'] }] }, 1));
    // TODO: In a future version, update versions throughout the tree in
    // live queries
    await expectNext(
      subscription,
      {
        $ver: 1,
        foo: [
          { $key: { $before: ['a'] }, $ver: 0 },
          { $key: ['a'], $val: 1, $ver: 0 },
          { $key: { $after: ['a'], $before: ['b'] }, $ver: 0 },
          { $key: ['b'], $ver: 1 },
          { $key: { $after: ['b'], $before: ['c'] }, $ver: 0 },
          { $key: ['c'], $val: 3, $ver: 0 },
          { $key: { $after: ['c'], $before: ['d'] }, $ver: 0 },
          { $key: ['d'], $val: 4, $ver: 0 },
        ],
      },
      0,
    );
  });

  test('accept_range_deletion_substitute', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: { $before: ['a'] } },
            { $key: ['a'], $val: 1 },
            { $key: { $after: ['a'], $before: ['b'] } },
            { $key: ['b'], $val: 2 },
            { $key: { $after: ['b'], $before: ['c'] } },
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
          ],
        },
        0,
      ),
    );
    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['b'] } },
        { $key: ['b'], $val: 2 },
        { $key: { $after: ['b'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
      ],
    });
    expect(backend.read).toHaveBeenCalledTimes(1);

    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: ['b'] },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
          ],
        },
        1,
      ),
    );

    await expectNext(
      subscription,
      // prettier-ignore
      {
        $ver: 1,
        foo: [
          { $key: { $before: ['a'] }, $ver: 0 },
          { $key: ['a'], $val: 1, $ver: 0 },
          { $key: { $after: ['a'], $before: ['b'] }, $ver: 0 },
          { $key: ['b'], $ver: 1 },
          { $key: { $after: ['b'], $before: ['c'] }, $ver: 0 },
          { $key: ['c'], $val: 3, $ver: 0 },
          { $key: { $after: ['c'], $before: ['d'] }, $ver: 1 },
          { $key: ['d'], $val: 4, $ver: 1 },
        ],
      },
    );
    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('back_range_deletion_substitute', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
            { $key: { $after: ['e'] } },
          ],
        },
        0,
      ),
    );
    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $last: 3 } } }),
    );
    await expectNext(subscription, {
      foo: [
        { $key: ['c'], $val: 3 },
        { $key: { $after: ['c'], $before: ['d'] } },
        { $key: ['d'], $val: 4 },
        { $key: { $after: ['d'], $before: ['e'] } },
        { $key: ['e'], $val: 5 },
        { $key: { $after: ['e'] } },
      ],
    });

    backend.write(
      // prettier-ignore
      encodeGraph({
        foo: [
          { $key: ['b'], $val: 2 },
          { $key: { $after: ['b'], $until: ['c'] } },
        ]
      }, 1),
    );

    await expectNext(subscription, {
      $ver: 1,
      foo: [
        { $key: ['b'], $val: 2 },
        { $key: { $after: ['b'], $until: ['c'] } },
        { $key: { $after: ['c'], $before: ['d'] }, $ver: 0 },
        { $key: ['d'], $val: 4, $ver: 0 },
        { $key: { $after: ['d'], $before: ['e'] }, $ver: 0 },
        { $key: ['e'], $val: 5, $ver: 0 },
        { $key: { $after: ['e'] }, $ver: 0 },
      ],
    });

    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    backend.write(
      encodeGraph(
        {
          foo: [
            { $key: { $before: ['a'] } },
            { $key: ['a'], $val: 1 },
            { $key: { $after: ['a'], $before: ['c'] } },
            { $key: ['c'], $val: 3 },
            { $key: { $after: ['c'], $before: ['d'] } },
            { $key: ['d'], $val: 4 },
            { $key: { $after: ['d'], $before: ['e'] } },
            { $key: ['e'], $val: 5 },
            { $key: { $after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      encodeQuery({ foo: { $key: { $first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
        { $key: { $after: ['c'], $before: ['d'] } },
        { $key: ['d'], $val: 4 },
      ],
    });
    backend.write(encodeGraph({ foo: [{ $key: ['b'], $val: 2 }] }, 0));
    await expectNext(subscription, {
      foo: [
        { $key: { $before: ['a'] } },
        { $key: ['a'], $val: 1 },
        { $key: { $after: ['a'], $before: ['b'] } },
        { $key: ['b'], $val: 2 },
        { $key: { $after: ['b'], $before: ['c'] } },
        { $key: ['c'], $val: 3 },
      ],
    });
  });

  test('backward_range_deletion_at_start', async () => {
    backend.write(
      encodeGraph(
        {
          users: {
            1: { name: 'alice' },
            2: { name: 'bob' },
            3: { name: 'carol' },
          },
          usersByAge: [
            { $key: { $before: ['4'] } },
            { $key: ['4'], $ref: ['users', '1'] },
            { $key: { $after: ['4'], $before: ['5'] } },
            { $key: ['5'], $ref: ['users', '2'] },
            { $key: { $after: ['5'], $before: ['7'] } },
            { $key: ['7'], $ref: ['users', '3'] },
            { $key: { $after: ['7'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      encodeQuery({ usersByAge: { $key: { $last: 2 }, name: 1 } }, 0),
    );
    await expectNext(subscription, {
      users: {
        2: { name: 'bob' },
        3: { name: 'carol' },
      },
      usersByAge: [
        { $key: ['5'], $ref: ['users', '2'] },
        { $key: { $after: ['5'], $before: ['7'] } },
        { $key: ['7'], $ref: ['users', '3'] },
        { $key: { $after: ['7'] } },
      ],
    });
    backend.write(
      encodeGraph(
        {
          users: { 2: null },
          usersByAge: [{ $key: ['5'] }],
        },
        1,
      ),
    );
    await expectNext(
      subscription,
      // prettier-ignore
      [{ key: 'users', version: 1, children: encodeGraph({
          '1': { name: 'alice' },
          '3': { name: 'carol' },
        }, 0)},
        { key: 'usersByAge', version: 1, children: encodeGraph([
          { $key: ['4'], $ref: ['users', '1'] },
          { $key: { $after: ['4'], $before: ['5'] } },
          { $key: ['5'], $ver: 1 },
          { $key: { $after: ['5'], $before: ['7'] } },
          { $key: ['7'], $ref: ['users', '3'] },
          { $key: { $after: ['7'] } },
        ], 0)}
      ],
    );
  });
});
