import Graffy from '@graffy/core';
import { page, link, makeGraph, makeQuery } from '@graffy/common';
import { mockBackend } from '@graffy/testing';
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
        { foo: link(['bar', 'a']), bar: { a: { x: 3 }, b: { x: 5 } } },
        0,
      ),
    );
    const subscription = g.call('watch', makeQuery({ foo: { x: 1 } }, 0), {
      raw: true,
    });

    await expectNext(subscription, {
      foo: link(['bar', 'a']),
      bar: { a: { x: 3 } },
    });
    backend.write(makeGraph({ foo: link(['bar', 'b']) }, 0));
    await expectNext(subscription, {
      foo: link(['bar', 'b']),
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
          foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ first: 3 }, 1] }, 0),
      {
        raw: true,
      },
    );
    await expectNext(subscription, {
      foo: page({ a: 1, b: 2, c: 3 }, '', 'c'),
    });
    backend.write(makeGraph({ foo: { b: null } }, 1, 0));
    await expectNext(
      subscription,
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: 'b', end: 'b', version: 1 },
          { key: 'c\0', end: 'c\uffff', version: 0 },
          { key: 'd', value: 4, version: 0 }
        ] }
      ],
    );
  });

  test('range_insertion', async () => {
    backend.write(
      makeGraph(
        {
          foo: page({ a: 1, c: 3, d: 4, e: 5 }),
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ first: 3 }, 1] }, 0),
      {
        raw: true,
      },
    );
    await expectNext(subscription, {
      foo: page({ a: 1, c: 3, d: 4 }, '', 'd'),
    });
    backend.write(makeGraph({ foo: { b: 2 } }, 0));
    await expectNext(subscription, { foo: { b: 2 } });
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
    backend.write(makeGraph({ foo: link(['bar', 'a']) }, 0));

    const subscription = g.call('watch', makeQuery({ foo: { x: 1 } }, 0));
    await expectNext(subscription, {
      foo: link(['bar', 'a']),
      bar: { a: { x: 5 } },
    });
    backend.write(makeGraph({ foo: link(['bar', 'b']) }, 0));
    await expectNext(subscription, {
      foo: link(['bar', 'b']),
      bar: { b: { x: 6 } },
    });
    backend.write(makeGraph({ bar: { a: { x: 7 } } }, 0));
    // The /bar/a update should not be sent.
    // await subscription.next(); // TODO: Remove this!
    backend.write(makeGraph({ bar: { b: { x: 3 } } }, 0));
    await expectNext(subscription, {
      foo: link(['bar', 'b']),
      bar: { b: { x: 3 } },
    });
  });

  test('range_deletion', async () => {
    backend.write(
      makeGraph({ foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }) }, 0),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ first: 3 }, 1] }, 0),
    );
    await expectNext(subscription, {
      foo: page({ a: 1, b: 2, c: 3 }, '', 'c'),
    });
    backend.write(makeGraph({ foo: { b: null } }, 1));
    // TODO: In a future version, update versions throughout the tree in
    // live queries
    await expectNext(
      subscription,
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: '', end: '`\uffff', version: 0 },
          { key: 'a', value: 1, version: 0 },
          { key: 'a\0', end: 'a\uffff', version: 0},
          { key: 'b', end: 'b', version: 1 },
          { key: 'b\0', end: 'b\uffff', version: 0 },
          { key: 'c', value: 3, version: 0 },
          { key: 'c\0', end: 'c\uffff', version: 0 },
          { key: 'd', value: 4, version: 0 }
        ] }
      ],
    );
  });

  test('accept_range_deletion_substitute', async () => {
    backend.write(
      makeGraph({ foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }) }, 0),
    );
    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ first: 3 }, 1] }, 0),
    );
    await expectNext(subscription, {
      foo: page({ a: 1, b: 2, c: 3 }, '', 'c'),
    });
    expect(backend.read).toHaveBeenCalledTimes(1);

    backend.write(makeGraph({ foo: page({ b: null, d: 4 }, 'c\0', 'd') }, 1));
    await expectNext(
      subscription,
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: '', end: '`\uffff', version: 0 },
          { key: 'a', value: 1, version: 0 },
          { key: 'a\0', end: 'a\uffff', version: 0},
          { key: 'b', end: 'b', version: 1 },
          { key: 'b\0', end: 'b\uffff', version: 0 },
          { key: 'c', value: 3, version: 0 },
          { key: 'c\0', end: 'c\uffff', version: 1 },
          { key: 'd', value: 4, version: 1 }
        ] }
      ],
    );
    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('back_range_deletion_substitute', async () => {
    backend.write(
      makeGraph({ foo: page({ c: 3, d: 4, e: 5 }, 'c', '\uffff') }, 0),
    );
    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ last: 3 }, 1] }, 0),
    );
    await expectNext(subscription, {
      foo: page({ c: 3, d: 4, e: 5 }, 'c', '\uffff'),
    });

    backend.write(
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: 'b', version: 1, value: 2 },
          { key: 'b\0', end: 'c', version: 1 }
        ] }
      ],
    );

    await expectNext(
      subscription,
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: 'b', version: 1, value: 2 },
          { key: 'b\0', end: 'c', version: 1 },
          { key: 'c\0', end: 'c\uffff', version: 0 },
          { key: 'd', value: 4, version: 0 },
          { key: 'd\0', end: 'd\uffff', version: 0 },
          { key: 'e', value: 5, version: 0 },
          { key: 'e\0', end: '\uffff', version: 0 },
        ] }
      ],
    );
    expect(backend.read).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    backend.write(makeGraph({ foo: page({ a: 1, c: 3, d: 4, e: 5 }) }, 0));
    const subscription = g.call(
      'watch',
      makeQuery({ foo: [{ first: 3 }, 1] }, 0),
    );
    await expectNext(subscription, {
      foo: page({ a: 1, c: 3, d: 4 }, '', 'd'),
    });
    backend.write(makeGraph({ foo: { b: 2 } }, 0));
    await expectNext(subscription, {
      foo: page({ a: 1, b: 2, c: 3 }, '', 'c'),
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
          usersByAge: page(
            {
              '4': link(['users', '1']),
              '5': link(['users', '2']),
              '7': link(['users', '3']),
            },
            '',
            '\uFFFF',
          ),
        },
        0,
      ),
    );

    const subscription = g.call(
      'watch',
      makeQuery({ usersByAge: [{ last: 2 }, { name: 1 }] }, 0),
    );
    await expectNext(subscription, {
      users: {
        '2': { name: 'bob' },
        '3': { name: 'carol' },
      },
      usersByAge: page(
        { '5': link(['users', '2']), '7': link(['users', '3']) },
        '5',
        '\uffff',
      ),
    });
    backend.write(
      makeGraph(
        {
          users: { '2': null },
          usersByAge: { '5': null },
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
        { key: 'usersByAge', version: 1, children: [
          { key: '4', path: ['users', '1'], version: 0 },
          { key: '4\0', end: '4\uffff', version: 0 },
          { key: '5', end: '5', version: 1 },
          { key: '5\0', end: '6\uffff', version: 0 },
          { key: '7', path: ['users', '3'], version: 0 },
          { key: '7\0', end: '\uffff', version: 0 },
        ]}
      ],
    );
  });
});
