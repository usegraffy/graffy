import Graffy from '@graffy/core';
import { makeGraph, makeQuery } from '@graffy/common';
import { mockBackend, format } from '@graffy/testing';
import fill from './index.js';

const expectNext = async (subscription, expected, version = 0) => {
  // console.log('assert', expected);
  expect((await subscription.next()).value).toEqual(
    Array.isArray(expected) ? expected : makeGraph(expected, version),
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
    const subscription = g.call('watch', makeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
      skipFill: 1,
    });

    await expectNext(subscription, undefined);
    backend.write(makeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(makeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('simple', async () => {
    backend.write(makeGraph({ foo: { a: 3 } }, 0));
    const subscription = g.call('watch', makeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
    });
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(makeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('simple-empty', async () => {
    const subscription = g.call('watch', makeQuery({ foo: { a: 1 } }, 0), {
      raw: true,
    });
    await expectNext(subscription, null);
    backend.write(makeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(makeGraph({ foo: { a: 4 } }, 1));
    await expectNext(subscription, { foo: { a: 4 } }, 1);
  });

  test('overlap', async () => {
    backend.write(makeGraph({ foo: { a: 2 }, bar: { b: 2 } }, 0));
    const subscription = g.call(
      'watch',
      makeQuery({ foo: { a: 1 }, bar: { b: 1 } }, 0),
      {
        raw: true,
      },
    );

    await expectNext(subscription, { foo: { a: 2 }, bar: { b: 2 } });
    backend.write(makeGraph({ foo: { a: 3 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(makeGraph({ foo: { a: 4 } }, 0));
    await expectNext(subscription, { foo: { a: 4 } });
    backend.write(makeGraph({ bar: { a: 7 } }, 0));
    backend.write(makeGraph({ bar: { b: 6 } }, 0));
    await expectNext(subscription, { bar: { b: 6 } });
  });

  test('link', async () => {
    backend.write(
      makeGraph(
        { foo: { _ref_: ['bar', 'a'] }, bar: { a: { x: 3 }, b: { x: 5 } } },
        0,
      ),
    );
    const subscription = g.call('watch', makeQuery({ foo: { x: 1 } }, 0), {
      raw: true,
    });

    await expectNext(subscription, {
      foo: { _ref_: ['bar', 'a'] },
      bar: { a: { x: 3 } },
    });
    backend.write(makeGraph({ foo: { _ref_: ['bar', 'b'] } }, 0));
    await expectNext(subscription, {
      foo: { _ref_: ['bar', 'b'] },
      bar: { b: { x: 5 } },
    });
    backend.write(makeGraph({ bar: { a: { x: 7 } } })); // Should not be sent!
    backend.write(makeGraph({ bar: { b: { x: 3 } } }, 0));
    await expectNext(subscription, { bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _val_: 1 },
            { _key_: { after: ['a'], before: ['b'] } },
            { _key_: ['b'], _val_: 2 },
            { _key_: { after: ['b'], before: ['c'] } },
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
            { _key_: { after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { first: 3 } } }),
      { raw: true },
    );
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['b'] } },
        { _key_: ['b'], _val_: 2 },
        { _key_: { after: ['b'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
      ],
    });
    backend.write(makeGraph({ foo: [{ _key_: ['b'], _val_: null }] }, 1));
    await expectNext(
      subscription,
      // prettier-ignore
      { _ver_: 1, foo: [
          { _key_: { since: ['b'], until: ['b'] } },
          { _key_: { after: ['c'], before: ['d'] }, _ver_: 0 },
          { _key_: ['d'], _val_: 4, _ver_: 0 }
        ] },
    );
  });

  test('range_insertion', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _val_: 1 },
            { _key_: { after: ['a'], before: ['c'] } },
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
            { _key_: { after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { first: 3 } } }, 0),
      {
        raw: true,
      },
    );
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
        { _key_: { after: ['c'], before: ['d'] } },
        { _key_: ['d'], _val_: 4 },
      ],
    });
    backend.write(makeGraph({ foo: [{ _key_: ['b'], _val_: 2 }] }, 0));
    await expectNext(subscription, { foo: [{ _key_: ['b'], _val_: 2 }] });
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
    backend.write(makeGraph({ foo: { a: 3 } }, 0));
    const subscription = g.call('watch', makeQuery({ foo: { a: 1 } }, 0));
    await expectNext(subscription, { foo: { a: 3 } });
    backend.write(makeGraph({ foo: { a: 4 } }, 0));
    await expectNext(subscription, { foo: { a: 4 } });
  });

  test('link', async () => {
    backend.write(makeGraph({ bar: { a: { x: 5 }, b: { x: 6 } } }, 0));
    backend.write(makeGraph({ foo: { _ref_: ['bar', 'a'] } }, 0));

    const subscription = g.call('watch', makeQuery({ foo: { x: 1 } }, 0));
    await expectNext(subscription, {
      foo: { _ref_: ['bar', 'a'] },
      bar: { a: { x: 5 } },
    });
    backend.write(makeGraph({ foo: { _ref_: ['bar', 'b'] } }, 0));
    await expectNext(subscription, {
      foo: { _ref_: ['bar', 'b'] },
      bar: { b: { x: 6 } },
    });
    backend.write(makeGraph({ bar: { a: { x: 7 } } }, 0));
    // The /bar/a update should not be sent.
    // await subscription.next(); // TODO: Remove this!
    backend.write(makeGraph({ bar: { b: { x: 3 } } }, 0));
    await expectNext(subscription, {
      foo: { _ref_: ['bar', 'b'] },
      bar: { b: { x: 3 } },
    });
  });

  test('range_deletion', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _val_: 1 },
            { _key_: { after: ['a'], before: ['b'] } },
            { _key_: ['b'], _val_: 2 },
            { _key_: { after: ['b'], before: ['c'] } },
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['b'] } },
        { _key_: ['b'], _val_: 2 },
        { _key_: { after: ['b'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
      ],
    });
    backend.write(makeGraph({ foo: [{ _key_: ['b'], _val_: null }] }, 1));
    // TODO: In a future version, update versions throughout the tree in
    // live queries
    await expectNext(
      subscription,
      {
        _ver_: 1,
        foo: [
          { _key_: { before: ['a'] }, _ver_: 0 },
          { _key_: ['a'], _val_: 1, _ver_: 0 },
          { _key_: { after: ['a'], before: ['b'] }, _ver_: 0 },
          { _key_: ['b'], _val_: null, _ver_: 1 },
          { _key_: { after: ['b'], before: ['c'] }, _ver_: 0 },
          { _key_: ['c'], _val_: 3, _ver_: 0 },
          { _key_: { after: ['c'], before: ['d'] }, _ver_: 0 },
          { _key_: ['d'], _val_: 4, _ver_: 0 },
        ],
      },
      0,
    );
  });

  test('accept_range_deletion_substitute', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _val_: 1 },
            { _key_: { after: ['a'], before: ['b'] } },
            { _key_: ['b'], _val_: 2 },
            { _key_: { after: ['b'], before: ['c'] } },
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
          ],
        },
        0,
      ),
    );
    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['b'] } },
        { _key_: ['b'], _val_: 2 },
        { _key_: { after: ['b'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
      ],
    });
    expect(backend.read).toHaveBeenCalledTimes(1);

    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: ['b'] },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
          ],
        },
        1,
      ),
    );

    await expectNext(
      subscription,
      // prettier-ignore
      {
        _ver_: 1,
        foo: [
          { _key_: { before: ['a'] }, _ver_: 0 },
          { _key_: ['a'], _val_: 1, _ver_: 0 },
          { _key_: { after: ['a'], before: ['b'] }, _ver_: 0 },
          { _key_: ['b'], _val_: null, _ver_: 1 },
          { _key_: { after: ['b'], before: ['c'] }, _ver_: 0 },
          { _key_: ['c'], _val_: 3, _ver_: 0 },
          { _key_: { after: ['c'], before: ['d'] }, _ver_: 1 },
          { _key_: ['d'], _val_: 4, _ver_: 1 },
        ],
      },
    );
    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('back_range_deletion_substitute', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
            { _key_: { after: ['e'] } },
          ],
        },
        0,
      ),
    );
    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { last: 3 } } }),
    );
    await expectNext(subscription, {
      foo: [
        { _key_: ['c'], _val_: 3 },
        { _key_: { after: ['c'], before: ['d'] } },
        { _key_: ['d'], _val_: 4 },
        { _key_: { after: ['d'], before: ['e'] } },
        { _key_: ['e'], _val_: 5 },
        { _key_: { after: ['e'] } },
      ],
    });

    backend.write(
      // prettier-ignore
      makeGraph({
        foo: [
          { _key_: ['b'], _val_: 2 },
          { _key_: { after: ['b'], until: ['c'] } },
        ]
      }, 1),
    );

    await expectNext(subscription, {
      _ver_: 1,
      foo: [
        { _key_: ['b'], _val_: 2 },
        { _key_: { after: ['b'], until: ['c'] } },
        { _key_: { after: ['c'], before: ['d'] }, _ver_: 0 },
        { _key_: ['d'], _val_: 4, _ver_: 0 },
        { _key_: { after: ['d'], before: ['e'] }, _ver_: 0 },
        { _key_: ['e'], _val_: 5, _ver_: 0 },
        { _key_: { after: ['e'] }, _ver_: 0 },
      ],
    });
    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    backend.write(
      makeGraph(
        {
          foo: [
            { _key_: { before: ['a'] } },
            { _key_: ['a'], _val_: 1 },
            { _key_: { after: ['a'], before: ['c'] } },
            { _key_: ['c'], _val_: 3 },
            { _key_: { after: ['c'], before: ['d'] } },
            { _key_: ['d'], _val_: 4 },
            { _key_: { after: ['d'], before: ['e'] } },
            { _key_: ['e'], _val_: 5 },
            { _key_: { after: ['e'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: { _key_: { first: 3 } } }, 0),
    );
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
        { _key_: { after: ['c'], before: ['d'] } },
        { _key_: ['d'], _val_: 4 },
      ],
    });
    backend.write(makeGraph({ foo: [{ _key_: ['b'], _val_: 2 }] }, 0));
    await expectNext(subscription, {
      foo: [
        { _key_: { before: ['a'] } },
        { _key_: ['a'], _val_: 1 },
        { _key_: { after: ['a'], before: ['b'] } },
        { _key_: ['b'], _val_: 2 },
        { _key_: { after: ['b'], before: ['c'] } },
        { _key_: ['c'], _val_: 3 },
      ],
    });
  });

  test('backward_range_deletion_at_start', async () => {
    backend.write(
      makeGraph(
        {
          users: {
            '1': { name: 'alice' },
            '2': { name: 'bob' },
            '3': { name: 'carol' },
          },
          usersByAge: [
            { _key_: { before: ['4'] } },
            { _key_: ['4'], _ref_: ['users', '1'] },
            { _key_: { after: ['4'], before: ['5'] } },
            { _key_: ['5'], _ref_: ['users', '2'] },
            { _key_: { after: ['5'], before: ['7'] } },
            { _key_: ['7'], _ref_: ['users', '3'] },
            { _key_: { after: ['7'] } },
          ],
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ usersByAge: { _key_: { last: 2 }, name: 1 } }, 0),
    );
    await expectNext(subscription, {
      users: {
        '2': { name: 'bob' },
        '3': { name: 'carol' },
      },
      usersByAge: [
        { _key_: ['5'], _ref_: ['users', '2'] },
        { _key_: { after: ['5'], before: ['7'] } },
        { _key_: ['7'], _ref_: ['users', '3'] },
        { _key_: { after: ['7'] } },
      ],
    });
    backend.write(
      makeGraph(
        {
          users: { '2': null },
          usersByAge: [{ _key_: ['5'] }],
        },
        1,
      ),
    );
    await expectNext(
      subscription,
      // prettier-ignore
      [{ key: 'users', version: 1, children: makeGraph({
          '1': { name: 'alice' },
          '3': { name: 'carol' },
        }, 0)},
        { key: 'usersByAge', version: 1, children: makeGraph([
          { _key_: ['4'], _ref_: ['users', '1'] },
          { _key_: { after: ['4'], before: ['5'] } },
          { _key_: ['5'], _ver_: 1 },
          { _key_: { after: ['5'], before: ['7'] } },
          { _key_: ['7'], _ref_: ['users', '3'] },
          { _key_: { after: ['7'] } },
        ], 0)}
      ],
    );
  });
});
