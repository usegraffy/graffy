import Graffy from '@graffy/core';
import { page, link, graph, query } from '@graffy/decorate';
import { mockBackend, debug } from '@graffy/testing';
import live from './index.js';

const expectNext = async (sub, expected, clock) => {
  expect((await sub.next()).value).toEqual(graph(expected, clock));
};

describe('changes', () => {
  let g;
  let backend;

  beforeEach(() => {
    g = new Graffy();
    g.use(live());
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
        { key: 'foo', clock: 1, children: [
          { key: 'b', end: 'b', clock: 1 },
          { key: 'c\0', end: 'c\uffff', clock: 0 },
          { key: 'd', value: 4, clock: 0 }
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
    g.use(live());
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
    // TODO: In a future version, update clocks throughout the tree in
    // live queries
    await expectNext(
      sub,
      // prettier-ignore
      [
        { key: 'foo', clock: 0, children: [
          { key: '', end: '`\uffff', clock: 0 },
          { key: 'a', value: 1, clock: 0 },
          { key: 'a\0', end: 'a\uffff', clock: 0},
          { key: 'b', end: 'b', clock: 1 },
          { key: 'b\0', end: 'b\uffff', clock: 0 },
          { key: 'c', value: 3, clock: 0 },
          { key: 'c\0', end: 'c\uffff', clock: 0 },
          { key: 'd', value: 4, clock: 0 }
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
        { key: 'foo', clock: 0, children: [
          { key: '', end: '`\uffff', clock: 0 },
          { key: 'a', value: 1, clock: 0 },
          { key: 'a\0', end: 'a\uffff', clock: 0},
          { key: 'b', end: 'b', clock: 1 },
          { key: 'b\0', end: 'b\uffff', clock: 0 },
          { key: 'c', value: 3, clock: 0 },
          { key: 'c\0', end: 'c\uffff', clock: 1 },
          { key: 'd', value: 4, clock: 1 }
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
});
