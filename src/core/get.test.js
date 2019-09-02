import Graffy from './Graffy';
import fill from '@graffy/fill';
import { page, link, graph, query, decorate } from '@graffy/common';
// import { merge } from '@graffy/common';

describe('get', () => {
  let g;
  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
  });

  test('simple', async () => {
    g.use('/foo', graffy => {
      graffy.onGet('/bar', () => Promise.resolve(graph({ bar: 42 })));
    });
    expect(decorate(await g.get(query({ foo: { bar: 1 } })))).toEqual({
      foo: { bar: 42 },
    });
  });

  test('overlap', async () => {
    g.use('/foo', graffy => {
      graffy.onGet('/baz', () => Promise.resolve(graph({ baz: 15 })));
      graffy.onGet('/bar', () => Promise.resolve(graph({ bar: 42 })));
    });
    expect(decorate(await g.get(query({ foo: { bar: 1, baz: 1 } })))).toEqual({
      foo: { bar: 42, baz: 15 },
    });
  });

  test('missing_to_null', async () => {
    // TODO: Capping results is not yet implemented
    g.onGet('/foo', () => graph({ foo: { bar: 45, baz: null } }));
    expect(decorate(await g.get(query({ foo: { bar: 1, baz: 1 } })))).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get(query({ foo: { bar: 1, baz: 1 } }))).toEqual(
      graph({
        foo: { bar: 45, baz: null },
      }),
    );
  });

  test.skip('empty_obj_to_null', async () => {
    // Skipping: Leaf branch mismatch now throws.
    // Should this change?
    g.onGet('/foo', () => graph({ foo: { bar: 45, baz: { bad: 3 }, f: 3 } }));
    expect(decorate(await g.get(query({ foo: { bar: 1, baz: 1 } })))).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get(query({ foo: { bar: 1, baz: 1 } }))).toEqual(
      graph({
        foo: { bar: 45, baz: null },
      }),
    );
  });

  test('null_to_null', async () => {
    g.onGet('/foo', () => graph({ foo: { bar: 45, baz: null } }));
    expect(decorate(await g.get(query({ foo: { bar: 1, baz: 1 } })))).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get(query({ foo: { bar: 1, baz: 1 } }))).toEqual(
      graph({
        foo: { bar: 45, baz: null },
      }),
    );
  });

  test('getKnown', async () => {
    g.use(graffy => {
      graffy.onGet('/foo', () =>
        Promise.resolve(graph({ foo: { baz: 15, bar: 42 } })),
      );
    });
    expect(decorate(await g.get(query({ foo: { bar: 1 } })))).toEqual({
      foo: { bar: 42 },
    });
  });

  describe('range-getKnown', () => {
    let resolver;
    beforeEach(() => {
      resolver = jest.fn();
      resolver.mockReturnValue(
        graph({
          foo: page({
            a: { baz: 15, bar: 42 },
            b: { baz: 16, bar: 41 },
            c: { baz: 17, bar: 40 },
            d: { baz: 18, bar: 39 },
            e: { baz: 19, bar: 38 },
          }),
        }),
      );
      g.use(graffy => {
        graffy.onGet((...args) => {
          const res = resolver(...args);
          return res;
        });
      });
    });

    test('all', async () => {
      const result = await g.get(
        query({ foo: [{ after: '', before: '\uffff' }, { bar: 1 }] }),
      );
      expect(resolver).toBeCalledWith(
        query({ foo: [{ after: '', before: '\uffff' }, { bar: 1 }] }),
        {},
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }, { bar: 40 }, { bar: 39 }, { bar: 38 }],
      });
    });

    test('first', async () => {
      const result = await g.get(query({ foo: [{ first: 2 }, { bar: 1 }] }));
      expect(decorate(result)).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }],
      });
    });
    test('last', async () => {
      const result = await g.get(query({ foo: [{ last: 1 }, { bar: 1 }] }));
      expect(decorate(result)).toEqual({ foo: [{ bar: 38 }] });
    });
    test('first-after', async () => {
      const result = await g.get(
        query({ foo: [{ first: 2, after: 'b' }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before', async () => {
      const result = await g.get(
        query({ foo: [{ last: 3, before: 'd' }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-before-after', async () => {
      const result = await g.get(
        query({ foo: [{ after: 'b', before: 'g', first: 2 }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before-after', async () => {
      const result = await g.get(
        query({ foo: [{ after: 'a', before: 'd', last: 3 }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-before-after-filled', async () => {
      const result = await g.get(
        query({ foo: [{ after: 'b', before: 'c', first: 4 }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before-after-filled', async () => {
      const result = await g.get(
        query({ foo: [{ after: 'b', before: 'd', last: 5 }, { bar: 1 }] }),
      );
      expect(decorate(result)).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });

    test('multi', async () => {
      const result = await g.get(
        query({ foo: { a: { bar: 1 }, b: { baz: 1 } } }),
      );
      expect(resolver).toBeCalledWith(
        query({ foo: { a: { bar: 1 }, b: { baz: 1 } } }),
        {},
      );
      expect(decorate(result)).toEqual({
        foo: { a: { bar: 42 }, b: { baz: 16 } },
      });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.use(graffy => {
        graffy.onGet('/foo', () => graph({ foo: link(['bar']) }));
        graffy.onGet('/bar', () => graph({ bar: { baz: 3 } }));
      });
    });

    test('raw', async () => {
      expect(await g.get(query({ foo: { baz: 1 } }))).toEqual(
        graph({
          foo: link(['bar']),
          bar: { baz: 3 },
        }),
      );
    });

    test.skip('friendly', async () => {
      // Skipped: Update this test after decorate starts to remove
      // unrequested branches.
      expect(decorate(await g.get(query({ foo: { baz: 1 } })))).toEqual({
        foo: { baz: 3 },
      });
    });
  });
});
