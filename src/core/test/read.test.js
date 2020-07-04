import Graffy from '../Graffy';
import fill from '@graffy/fill';
import { page, link, key } from '@graffy/common';
// import { merge } from '@graffy/common';

describe('read', () => {
  let g;
  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
  });

  test('simple', async () => {
    g.use('/foo', (graffy) => {
      graffy.onRead('/bar', () => Promise.resolve({ baz: 42 }));
    });
    expect(await g.read('foo', { bar: { baz: 1 } })).toEqual({
      bar: { baz: 42 },
    });
  });

  test('overlap', async () => {
    g.use('/foo', (graffy) => {
      graffy.onRead('/baz', () => Promise.resolve({ x: 15 }));
      graffy.onRead('/bar', () => Promise.resolve({ x: 42 }));
    });
    expect(await g.read({ foo: { bar: { x: 1 }, baz: { x: 1 } } })).toEqual({
      foo: { bar: { x: 42 }, baz: { x: 15 } },
    });
  });

  test('remove_null', async () => {
    g.onRead('/foo', () => ({ bar: 45, baz: null }));
    expect(await g.read({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('leaf_branch_mismatch', async () => {
    g.onRead('/foo', () => ({ bar: 45, baz: { bad: 3 }, f: 3 }));
    expect(
      async () => await g.read({ foo: { bar: 1, baz: 1 } }),
    ).rejects.toThrow();
  });

  test('getKnown', async () => {
    g.use((graffy) => {
      graffy.onRead('/foo', () => Promise.resolve({ baz: 15, bar: 42 }));
    });
    expect(await g.read({ foo: { bar: 1 } })).toEqual({
      foo: { bar: 42 },
    });
  });

  describe('range-getKnown', () => {
    let provider;
    beforeEach(() => {
      provider = jest.fn(() => {
        return {
          foo: page({
            [key('a')]: { baz: 15, bar: 42 },
            [key('b')]: { baz: 16, bar: 41 },
            [key('c')]: { baz: 17, bar: 40 },
            [key('d')]: { baz: 18, bar: 39 },
            [key('e')]: { baz: 19, bar: 38 },
          }),
        };
      });
      g.onRead(provider);
    });

    test('all', async () => {
      const result = await g.read({
        foo: [{ bar: 1 }],
      });
      expect(provider).toBeCalledWith(
        { foo: [{ first: 4096 }, { bar: true }] },
        {},
      );
      expect(result).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }, { bar: 40 }, { bar: 39 }, { bar: 38 }],
      });
    });

    test('first', async () => {
      const result = await g.read({ foo: [{ first: 2 }, { bar: 1 }] });
      expect(result).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }],
      });
    });
    test('last', async () => {
      const result = await g.read({ foo: [{ last: 1 }, { bar: 1 }] });
      expect(result).toEqual({ foo: [{ bar: 38 }] });
    });
    test('first-after', async () => {
      const result = await g.read({
        foo: [{ first: 2, after: 'b' }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before', async () => {
      const result = await g.read({
        foo: [{ last: 3, before: 'd' }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-before-after', async () => {
      const result = await g.read({
        foo: [{ after: 'b', before: 'g', first: 2 }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before-after', async () => {
      const result = await g.read({
        foo: [{ after: 'a', before: 'd', last: 3 }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-before-after-filled', async () => {
      const result = await g.read({
        foo: [{ after: 'b', before: 'c', first: 4 }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-before-after-filled', async () => {
      const result = await g.read({
        foo: [{ after: 'b', before: 'd', last: 5 }, { bar: 1 }],
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });

    test('multi', async () => {
      const result = await g.read({
        foo: { [key('a')]: { bar: 1 }, [key('b')]: { baz: 1 } },
      });
      expect(provider).toBeCalledWith(
        { foo: { [key('a')]: { bar: true }, [key('b')]: { baz: true } } },
        {},
      );
      expect(result).toEqual({
        foo: { [key('a')]: { bar: 42 }, [key('b')]: { baz: 16 } },
      });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.onRead('/foo', () => ({ x: link(['bar']) }));
      g.onRead('/bar', () => ({ baz: 3 }));
    });

    // test('raw', async () => {
    //   expect(await g.read({ foo: {x: { baz: 1} } })).toEqual({
    //     foo: { x: link(['bar'])},
    //     bar: { baz: 3 },
    //   });
    // });

    test('friendly', async () => {
      // Update this test after decorate starts to remove
      // unrequested branches.
      expect(await g.read({ foo: { x: { baz: 1 } } })).toEqual({
        bar: { baz: 3 },
        foo: { x: { baz: 3 } },
      });
    });
  });
});
