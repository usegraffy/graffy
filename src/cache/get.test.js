import Graffy from '@graffy/core';
import cache from './index.js';
import { LINK_KEY, makePage } from '@graffy/common';

describe('get', () => {
  let g;
  beforeEach(() => {
    g = new Graffy();
    g.use(cache());
  });

  test('simple', async () => {
    g.use('/foo', graffy => {
      graffy.onGet('/bar', () => Promise.resolve({ bar: 42 }));
    });
    expect(await g.get({ foo: { bar: 1 } })).toEqual({
      foo: { bar: 42 },
    });
  });

  test('overlap', async () => {
    g.use('/foo', graffy => {
      graffy.onGet('/baz', () => Promise.resolve({ baz: 15 }));
      graffy.onGet('/bar', () => Promise.resolve({ bar: 42 }));
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 42, baz: 15 },
    });
  });

  test('missing_to_null', async () => {
    g.onGet('/foo', () => ({ foo: makePage({ bar: 45 }) }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 } }, { raw: true })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('empty_obj_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45, baz: { bad: 3 } } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 } }, { raw: true })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('null_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45, baz: null } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45 },
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 } }, { raw: true })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('getKnown', async () => {
    g.use(graffy => {
      graffy.onGet('/foo', () =>
        Promise.resolve({ foo: { baz: 15, bar: 42 } }),
      );
    });
    expect(await g.get({ foo: { bar: 1 } })).toEqual({
      foo: { bar: 42 },
    });
  });

  describe('range-getKnown', () => {
    let resolver;
    beforeEach(() => {
      resolver = jest.fn();
      resolver.mockReturnValue({
        foo: makePage({
          a: { baz: 15, bar: 42 },
          b: { baz: 16, bar: 41 },
          c: { baz: 17, bar: 40 },
          d: { baz: 18, bar: 39 },
          e: { baz: 19, bar: 38 },
        }),
      });
      g.use(graffy => {
        graffy.onGet(resolver);
      });
    });

    test('all', async () => {
      const result = await g.get({ foo: { '*': { bar: 1 } } });
      expect(resolver).toBeCalledWith({ foo: { '*': { bar: 1 } } }, {});
      expect(result).toEqual({
        foo: {
          a: { bar: 42 },
          b: { bar: 41 },
          c: { bar: 40 },
          d: { bar: 39 },
          e: { bar: 38 },
        },
      });
    });

    test('first', async () => {
      const result = await g.get({ foo: { '2**': { bar: 1 } } });
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { bar: 41 } } });
    });
    test('last', async () => {
      const result = await g.get({ foo: { '**1': { bar: 1 } } });
      expect(result).toEqual({ foo: { e: { bar: 38 } } });
    });
    test('first-after', async () => {
      const result = await g.get({ foo: { 'b*2**': { bar: 1 } } });
      expect(result).toEqual({ foo: { b: { bar: 41 }, c: { bar: 40 } } });
    });
    test('last-before', async () => {
      const result = await g.get({ foo: { '**3*d': { bar: 1 } } });
      expect(result).toEqual({
        foo: { b: { bar: 41 }, c: { bar: 40 }, d: { bar: 39 } },
      });
    });
    test('first-before-after', async () => {
      const result = await g.get({ foo: { 'b*2**g': { bar: 1 } } });
      expect(result).toEqual({ foo: { b: { bar: 41 }, c: { bar: 40 } } });
    });
    test('last-before-after', async () => {
      const result = await g.get({ foo: { 'a**3*d': { bar: 1 } } });
      expect(result).toEqual({
        foo: { b: { bar: 41 }, c: { bar: 40 }, d: { bar: 39 } },
      });
    });
    test('first-before-after-filled', async () => {
      const result = await g.get({ foo: { 'b*4**c': { bar: 1 } } });
      expect(result).toEqual({ foo: { b: { bar: 41 }, c: { bar: 40 } } });
    });
    test('last-before-after-filled', async () => {
      const result = await g.get({ foo: { 'b**5*d': { bar: 1 } } });
      expect(result).toEqual({
        foo: { b: { bar: 41 }, c: { bar: 40 }, d: { bar: 39 } },
      });
    });

    test('multi', async () => {
      const result = await g.get({ foo: { a: { bar: 1 }, b: { baz: 1 } } });
      expect(resolver).toBeCalledWith(
        { foo: { a: { bar: 1 }, b: { baz: 1 } } },
        {},
      );
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { baz: 16 } } });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.use(graffy => {
        graffy.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar'] } }));
        graffy.onGet('/bar', () => ({ bar: { baz: 3 } }));
      });
    });

    test('raw', async () => {
      expect(await g.get({ foo: { baz: 1 } }, { raw: true })).toEqual({
        foo: { [LINK_KEY]: ['bar'] },
        bar: { baz: 3 },
      });
    });

    test('friendly', async () => {
      expect(await g.get({ foo: { baz: 1 } })).toEqual({
        foo: { baz: 3 },
      });
    });
  });
});
