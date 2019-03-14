import Grue from '.';
import { LINK_KEY, PAGE_KEY } from './lib/constants';

describe('get', () => {
  let g;
  beforeEach(() => {
    g = new Grue();
  });

  test('simple', async () => {
    g.use('/foo', grue => {
      grue.onGet('/bar', () => Promise.resolve({ bar: 42 }));
    });
    expect(await g.get({ foo: { bar: 1 } })).toEqual({ foo: { bar: 42 } });
  });

  test('overlap', async () => {
    g.use('/foo', grue => {
      grue.onGet('/baz', () => Promise.resolve({ baz: 15 }));
      grue.onGet('/bar', () => Promise.resolve({ bar: 42 }));
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 42, baz: 15 },
    });
  });

  test('missing_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45 } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
    expect(await g.getRaw({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('undefined_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45, baz: undefined } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
    expect(await g.getRaw({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('empty_obj_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45, baz: { bad: 3 } } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
    expect(await g.getRaw({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('null_to_null', async () => {
    g.onGet('/foo', () => ({ foo: { bar: 45, baz: null } }));
    expect(await g.get({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
    expect(await g.getRaw({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('prune', async () => {
    g.use(grue => {
      grue.onGet('/foo', () => Promise.resolve({ foo: { baz: 15, bar: 42 } }));
    });
    expect(await g.get({ foo: { bar: 1 } })).toEqual({ foo: { bar: 42 } });
  });

  describe('range-prune', () => {
    let resolver;
    const anyFn = expect.any(Function);
    beforeEach(() => {
      resolver = jest.fn();
      resolver.mockReturnValue({
        foo: {
          a: { baz: 15, bar: 42 },
          b: { baz: 16, bar: 41 },
          c: { baz: 17, bar: 40 },
          d: { baz: 18, bar: 39 },
          e: { baz: 19, bar: 38 },
        },
      });
      g.use(grue => {
        grue.onGet(resolver);
      });
    });

    test('all', async () => {
      const result = await g.get({ foo: { '*': { bar: 1 } } });
      expect(resolver).toBeCalledWith(
        { query: { foo: { '*': { bar: 1 } } } },
        anyFn,
      );
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
        { query: { foo: { a: { bar: 1 }, b: { baz: 1 } } } },
        anyFn,
      );
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { baz: 16 } } });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.use(grue => {
        grue.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar'] } }));
        grue.onGet('/bar', () => ({ bar: { baz: 3 } }));
      });
    });

    test('raw', async () => {
      expect(await g.getRaw({ foo: { baz: 1 } })).toEqual({
        foo: { [LINK_KEY]: ['bar'] },
        bar: { baz: 3 },
      });
    });

    test('friendly', async () => {
      expect(await g.get({ foo: { baz: 1 } })).toEqual({ foo: { baz: 3 } });
    });
  });
});

describe('subscriptions', () => {
  describe('stream', () => {
    let g;
    let timer;
    let close;

    beforeEach(() => {
      g = new Grue();
      close = jest.fn();

      g.use('/foo', grue => {
        grue.onGet('/bar', ({ token }) => {
          let i = 1;
          expect(token).toHaveProperty('signaled');
          expect(token).toHaveProperty('onSignal');
          token.onSignal(close);
          timer = setInterval(() => grue.pub({ bar: i++ }), 10);
          return Promise.resolve({ bar: 0 });
        });
      });
    });

    afterEach(() => {
      clearTimeout(timer);
    });

    test('simple', async () => {
      const sub = g.sub({ foo: { bar: 1 } });
      let j = 0;
      for await (const val of sub) {
        expect(val).toEqual({ foo: { bar: j++ } });
        if (j === 3) break;
      }
      expect(close).toHaveBeenCalledTimes(1);
    });

    test('values', async () => {
      const sub = g.sub({ foo: { bar: 1 } }, { values: true });
      let j = 0;
      for await (const val of sub) {
        expect(val).toEqual({ foo: { bar: j++ } });
        if (j === 3) break;
      }
      expect(close).toHaveBeenCalledTimes(1);
    });
  });

  describe('changes', () => {
    let g;

    beforeEach(() => {
      g = new Grue();
    });

    test('object', async () => {
      g.onGet('/foo', () => ({ foo: { a: 3 } }));
      setTimeout(() => g.pub({ foo: { a: 4 } }), 10);
      const sub = g.sub({ foo: { a: true } });
      expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
      expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    });

    test('link', async () => {
      g.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar', 'a'] } }));
      g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
      setTimeout(() => g.pub({ foo: { [LINK_KEY]: ['bar', 'b'] } }), 10);
      setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
      setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

      const sub = g.sub({ foo: { x: true } });
      expect((await sub.next()).value).toEqual({
        foo: { [LINK_KEY]: ['bar', 'a'] },
        bar: { a: { x: 3 } },
      });
      expect((await sub.next()).value).toEqual({
        foo: { [LINK_KEY]: ['bar', 'b'] },
        bar: { b: { x: 5 } /*, a: null */ },
        // TODO: Should we explicitly remove data that is no longer kept up to
        // date, or leave that for the consumer to figure out?
      });
      // The /bar/a update should not be sent.
      expect((await sub.next()).value).toEqual({ bar: { b: { x: 1 } } });
    });

    test('range_deletion', async () => {
      g.onGet('/foo', () => ({ foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } }));
      setTimeout(() => g.pub({ foo: { b: null } }), 10);

      const sub = g.sub({ foo: { '3**': true } });
      expect((await sub.next()).value).toEqual({
        foo: { [PAGE_KEY]: ['', 'c'], a: 1, b: 2, c: 3 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 },
      });
    });

    test('range_insertion', async () => {
      g.onGet('/foo', () => ({ foo: { a: 1, c: 3, d: 4, e: 5 } }));
      setTimeout(() => g.pub({ foo: { b: 2 } }), 10);

      const sub = g.sub({ foo: { '3**': true } });
      expect((await sub.next()).value).toEqual({
        foo: { [PAGE_KEY]: ['', 'd'], a: 1, c: 3, d: 4 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { b: 2 },
      });
    });
  });

  describe('values', () => {
    let g;

    beforeEach(() => {
      g = new Grue();
    });

    test('object', async () => {
      g.onGet('/foo', () => ({ foo: { a: 3 } }));
      setTimeout(() => g.pub({ foo: { a: 4 } }), 10);
      const sub = g.sub({ foo: { a: true } }, { values: true });
      expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
      expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    });

    test('link', async () => {
      g.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar', 'a'] } }));
      g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
      setTimeout(() => g.pub({ foo: { [LINK_KEY]: ['bar', 'b'] } }), 10);
      setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
      setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

      const sub = g.sub({ foo: { x: true } }, { values: true });
      expect((await sub.next()).value).toEqual({
        foo: { x: 3 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { x: 5 },
        // TODO: Should we explicitly remove data that is no longer kept up to
        // date, or leave that for the consumer to figure out?
      });
      // The /bar/a update should not be sent.
      expect((await sub.next()).value).toEqual({ foo: { x: 1 } });
    });

    test('range_deletion', async () => {
      g.onGet('/foo', () => ({ foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } }));
      setTimeout(() => g.pub({ foo: { b: null } }), 10);

      const sub = g.sub({ foo: { '3**': true } }, { values: true });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, b: 2, c: 3 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, c: 3, d: 4 },
      });
    });

    test('accept_range_deletion_substitute', async () => {
      const onGet = jest.fn(() => {
        return { foo: { a: 1, b: 2, c: 3, d: 4, e: 5 } };
      });
      g.onGet('/foo', onGet);
      setTimeout(
        () => g.pub({ foo: { [PAGE_KEY]: ['c', 'd'], b: null, c: 3, d: 4 } }),
        10,
      );

      const sub = g.sub({ foo: { '3**': true } }, { values: true });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, b: 2, c: 3 },
      });
      expect(onGet).toHaveBeenCalledTimes(1);
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, c: 3, d: 4 },
      });
      expect(onGet).toHaveBeenCalledTimes(1);
    });

    test('range_insertion', async () => {
      g.onGet('/foo', () => ({ foo: { a: 1, c: 3, d: 4, e: 5 } }));
      setTimeout(() => g.pub({ foo: { b: 2 } }), 10);

      const sub = g.sub({ foo: { '3**': true } }, { values: true });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, c: 3, d: 4 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, b: 2, c: 3 },
      });
    });
  });
});
