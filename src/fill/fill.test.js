import Graffy from '@graffy/core';
import { page, link, graph, query } from '@graffy/common';
import { mockBackend, debug } from '@graffy/testing';
import fill from './index.js';

const expectNext = async (sub, expected, version) => {
  expect((await sub.next()).value).toEqual(graph(expected, version));
};

describe('changes', () => {
  let g;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
    backend = mockBackend();
    g.use(backend.middleware);
  });

  test('simple-skipFill', async () => {
    const sub = g.sub(query({ foo: { a: 1 } }, 0), { raw: true, skipFill: 1 });

    await expectNext(sub, undefined);
    backend.put(graph({ foo: { a: 3 } }));
    await expectNext(sub, { foo: { a: 3 } });
    backend.put(graph({ foo: { a: 4 } }));
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('simple', async () => {
    const sub = g.sub(query({ foo: { a: 1 } }, 0), { raw: true });

    // await expectNext(sub, undefined);
    backend.put(graph({ foo: { a: 3 } }));
    await expectNext(sub, { foo: { a: 3 } });
    backend.put(graph({ foo: { a: 4 } }));
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('overlap', async () => {
    backend.put(graph({ foo: { a: 2 }, bar: { b: 2 } }));
    const sub = g.sub(query({ foo: { a: 1 }, bar: { b: 1 } }, 0), {
      raw: true,
    });

    await expectNext(sub, { foo: { a: 2 }, bar: { b: 2 } });
    backend.put(graph({ foo: { a: 3 } }));
    await expectNext(sub, { foo: { a: 3 } });
    backend.put(graph({ foo: { a: 4 } }));
    await expectNext(sub, { foo: { a: 4 } });
    backend.put(graph({ bar: { a: 7 } }));
    backend.put(graph({ bar: { b: 6 } }));
    await expectNext(sub, { bar: { b: 6 } });
  });

  test('link', async () => {
    backend.put(
      graph({ foo: link(['bar', 'a']), bar: { a: { x: 3 }, b: { x: 5 } } }),
    );
    const sub = g.sub(query({ foo: { x: 1 } }, 0), { raw: true });

    await expectNext(sub, { foo: link(['bar', 'a']), bar: { a: { x: 3 } } });
    backend.put(graph({ foo: link(['bar', 'b']) }));
    await expectNext(sub, { foo: link(['bar', 'b']), bar: { b: { x: 5 } } });
    backend.put(graph({ bar: { a: { x: 7 } } })); // Should not be sent!
    backend.put(graph({ bar: { b: { x: 3 } } }));
    await expectNext(sub, { bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    backend.put(
      graph({
        foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }),
      }),
    );

    const sub = g.sub(query({ foo: [{ first: 3 }, 1] }, 0), { raw: true });
    await expectNext(sub, { foo: page({ a: 1, b: 2, c: 3 }, '', 'c') });
    backend.put(graph({ foo: { b: null } }, 1));
    await expectNext(
      sub,
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
    backend.put(
      graph({
        foo: page({ a: 1, c: 3, d: 4, e: 5 }),
      }),
    );

    const sub = g.sub(query({ foo: [{ first: 3 }, 1] }, 0), { raw: true });
    await expectNext(sub, { foo: page({ a: 1, c: 3, d: 4 }, '', 'd') });
    backend.put(graph({ foo: { b: 2 } }));
    await expectNext(sub, { foo: { b: 2 } });
  });
});

describe('values', () => {
  let g;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
    backend = mockBackend();
    g.use(backend.middleware);
  });

  test('object', async () => {
    backend.put(graph({ foo: { a: 3 } }));
    const sub = g.sub(query({ foo: { a: 1 } }, 0));
    await expectNext(sub, { foo: { a: 3 } });
    backend.put(graph({ foo: { a: 4 } }));
    await expectNext(sub, { foo: { a: 4 } });
  });

  test('link', async () => {
    backend.put(graph({ bar: { a: { x: 5 }, b: { x: 6 } } }));
    backend.put(graph({ foo: link(['bar', 'a']) }));

    const sub = g.sub(query({ foo: { x: 1 } }, 0));
    await expectNext(sub, { foo: link(['bar', 'a']), bar: { a: { x: 5 } } });
    backend.put(graph({ foo: link(['bar', 'b']) }));
    await expectNext(sub, { foo: link(['bar', 'b']), bar: { b: { x: 6 } } });
    backend.put(graph({ bar: { a: { x: 7 } } }));
    // The /bar/a update should not be sent.
    // await sub.next(); // TODO: Remove this!
    backend.put(graph({ bar: { b: { x: 3 } } }));
    await expectNext(sub, { foo: link(['bar', 'b']), bar: { b: { x: 3 } } });
  });

  test('range_deletion', async () => {
    backend.put(graph({ foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }) }));

    const sub = g.sub(query({ foo: [{ first: 3 }, 1] }, 0));
    await expectNext(sub, { foo: page({ a: 1, b: 2, c: 3 }, '', 'c') });
    backend.put(graph({ foo: { b: null } }, 1));
    // TODO: In a future version, update versions throughout the tree in
    // live queries
    await expectNext(
      sub,
      // prettier-ignore
      [
        { key: 'foo', version: 0, children: [
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
    backend.put(graph({ foo: page({ a: 1, b: 2, c: 3, d: 4, e: 5 }) }));
    const sub = g.sub(query({ foo: [{ first: 3 }, 1] }, 0));
    await expectNext(sub, { foo: page({ a: 1, b: 2, c: 3 }, '', 'c') });
    expect(backend.get).toHaveBeenCalledTimes(1);

    backend.put(graph({ foo: page({ b: null, d: 4 }, 'c\0', 'd') }, 1));
    await expectNext(
      sub,
      // prettier-ignore
      [
        { key: 'foo', version: 0, children: [
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
    expect(backend.get).toHaveBeenCalledTimes(1);
  });

  test.only('back_range_deletion_substitute', async () => {
    backend.put(graph({ foo: page({ c: 3, d: 4, e: 5 }, 'c', '\uffff') }));
    const sub = g.sub(query({ foo: [{ last: 3 }, 1] }, 0));
    await expectNext(sub, { foo: page({ c: 3, d: 4, e: 5 }, 'c', '\uffff') });

    backend.put(
      // prettier-ignore
      [
        { key: 'foo', version: 1, children: [
          { key: 'b', version: 1, value: 2 },
          { key: 'b\0', end: 'c', version: 1 }
        ] }
      ],
    );

    await expectNext(
      sub,
      // prettier-ignore
      [
        { key: 'foo', version: 0, children: [
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
    expect(backend.get).toHaveBeenCalledTimes(1);
  });

  test('range_insertion', async () => {
    backend.put(graph({ foo: page({ a: 1, c: 3, d: 4, e: 5 }) }));
    const sub = g.sub(query({ foo: [{ first: 3 }, 1] }, 0));
    await expectNext(sub, { foo: page({ a: 1, c: 3, d: 4 }, '', 'd') });
    backend.put(graph({ foo: { b: 2 } }));
    await expectNext(sub, { foo: page({ a: 1, b: 2, c: 3 }, '', 'c') });
  });

  test.skip('backward_range_deletion_at_start', async () => {
    backend.put(
      graph(
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

    const sub = g.sub(query({ usersByAge: [{ last: 2 }, { name: 1 }] }, 0));
    await expectNext(sub, {
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
    backend.put(
      graph(
        {
          users: { '2': null },
          usersByAge: { '5': null },
        },
        1,
      ),
    );
    await expectNext(sub, {
      users: {
        '1': { name: 'alice' },
        '3': { name: 'carol' },
      },
      usersByAge: [
        { key: '4', path: ['users', '1'], version: 0 },
        { key: '4\0', end: '4\uffff', version: 0 },
        { key: '5', end: '5', version: 1 },
        { key: '5\0', end: '6\uffff', version: 0 },
        { key: '7', path: ['users', '3'], version: 0 },
        { key: '7\0', end: '\uffff', version: 0 },
      ],
    });
  });
});
