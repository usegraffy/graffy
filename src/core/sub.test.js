import Graffy from './Graffy';
import { LINK_KEY, PAGE_KEY } from './lib/constants';

describe('subscriptions', () => {
  describe('stream', () => {
    let g;
    let timer;
    let close;

    beforeEach(() => {
      g = new Graffy();
      close = jest.fn();

      g.use('/foo', graffy => {
        graffy.onGet('/bar', (_, { token }) => {
          let i = 1;
          expect(token).toHaveProperty('signaled');
          expect(token).toHaveProperty('onSignal');
          token.onSignal(close);
          timer = setInterval(() => graffy.pub({ bar: i++ }), 10);
          return Promise.resolve({ bar: 0 });
        });
      });
    });

    afterEach(() => {
      clearTimeout(timer);
    });

    test('simple', async () => {
      const sub = g.get({ foo: { bar: 1 } });
      let j = 0;
      for await (const val of sub) {
        expect(val).toEqual({ foo: { bar: j++ } });
        if (j === 3) break;
      }
      expect(close).toHaveBeenCalledTimes(1);
    });

    test('values', async () => {
      const sub = g.get({ foo: { bar: 1 } });
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
      g = new Graffy();
    });

    test('object', async () => {
      g.onGet('/foo', () => ({ foo: { a: 3 } }));
      setTimeout(() => g.pub({ foo: { a: 4 } }), 10);
      const sub = g.get({ foo: { a: true } }, { raw: true });
      expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
      expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    });

    test('link', async () => {
      g.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar', 'a'] } }));
      g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
      setTimeout(() => g.pub({ foo: { [LINK_KEY]: ['bar', 'b'] } }), 10);
      setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
      setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

      const sub = g.get({ foo: { x: true } }, { raw: true });
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

      const sub = g.get({ foo: { '3**': true } }, { raw: true });
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

      const sub = g.get({ foo: { '3**': true } }, { raw: true });
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
      g = new Graffy();
    });

    test('object', async () => {
      g.onGet('/foo', () => ({ foo: { a: 3 } }));
      setTimeout(() => g.pub({ foo: { a: 4 } }), 10);
      const sub = g.get({ foo: { a: true } });
      expect((await sub.next()).value).toEqual({ foo: { a: 3 } });
      expect((await sub.next()).value).toEqual({ foo: { a: 4 } });
    });

    test('link', async () => {
      g.onGet('/foo', () => ({ foo: { [LINK_KEY]: ['bar', 'a'] } }));
      g.onGet('/bar', () => ({ bar: { a: { x: 3 }, b: { x: 5 } } }));
      setTimeout(() => g.pub({ foo: { [LINK_KEY]: ['bar', 'b'] } }), 10);
      setTimeout(() => g.pub({ bar: { a: { x: 7 } } }), 20);
      setTimeout(() => g.pub({ bar: { b: { x: 1 } } }), 20);

      const sub = g.get({ foo: { x: true } });
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

      const sub = g.get({ foo: { '3**': true } });
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

      const sub = g.get({ foo: { '3**': true } });
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

      const sub = g.get({ foo: { '3**': true } });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, c: 3, d: 4 },
      });
      expect((await sub.next()).value).toEqual({
        foo: { a: 1, b: 2, c: 3 },
      });
    });
  });
});
