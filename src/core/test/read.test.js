import Graffy from '../Graffy.js';
import fill from '@graffy/fill';

describe('read', () => {
  let g;
  beforeEach(() => {
    g = new Graffy();
    g.use(fill());
  });

  test('simple', async () => {
    g.use('foo', (graffy) => {
      graffy.onRead('bar', () => Promise.resolve({ baz: 42 }));
    });
    expect(await g.read('foo', { bar: { baz: 1 } })).toEqual({
      bar: { baz: 42 },
    });
  });

  test('overlap', async () => {
    g.use('foo', (graffy) => {
      graffy.onRead('baz', () => Promise.resolve({ x: 15 }));
      graffy.onRead('bar', () => Promise.resolve({ x: 42 }));
    });
    expect(await g.read({ foo: { bar: { x: 1 }, baz: { x: 1 } } })).toEqual({
      foo: { bar: { x: 42 }, baz: { x: 15 } },
    });
  });

  test('remove_null', async () => {
    g.onRead('foo', () => ({ bar: 45, baz: null }));
    expect(await g.read({ foo: { bar: 1, baz: 1 } })).toEqual({
      foo: { bar: 45, baz: null },
    });
  });

  test('leaf_branch_mismatch', async () => {
    g.onRead('foo', () => ({ bar: 45, baz: { bad: 3 }, f: 3 }));
    expect(
      async () => await g.read({ foo: { bar: 1, baz: 1 } }),
    ).rejects.toThrow();
  });

  test('getKnown', async () => {
    g.use((graffy) => {
      graffy.onRead('foo', () => Promise.resolve({ baz: 15, bar: 42 }));
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
          foo: [
            { $key: { x: 'a' }, baz: 15, bar: 42 },
            { $key: { x: 'b' }, baz: 16, bar: 41 },
            { $key: { x: 'c' }, baz: 17, bar: 40 },
            { $key: { x: 'd' }, baz: 18, bar: 39 },
            { $key: { x: 'e' }, baz: 19, bar: 38 },
          ],
        };
      });
      g.onRead(provider);
    });

    test('all', async () => {
      const result = await g.read({
        foo: { $key: { $first: 100 }, bar: 1 },
      });
      expect(provider).toBeCalledWith(
        { foo: [{ $key: { $first: 100 }, bar: true }] },
        {},
      );
      expect(result).toEqual({
        foo: [
          { $key: { x: 'a' }, bar: 42 },
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
          { $key: { x: 'd' }, bar: 39 },
          { $key: { x: 'e' }, bar: 38 },
        ],
      });
    });

    test('first', async () => {
      const result = await g.read({ foo: { $key: { $first: 2 }, bar: 1 } });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'a' }, bar: 42 },
          { $key: { x: 'b' }, bar: 41 },
        ],
      });
    });
    test('last', async () => {
      const result = await g.read({ foo: { $key: { $last: 1 }, bar: 1 } });
      expect(result).toEqual({ foo: [{ $key: { x: 'e' }, bar: 38 }] });
    });
    test('first-since', async () => {
      const result = await g.read({
        foo: { $key: { $first: 2, $since: 'b' }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
        ],
      });
    });
    test('last-until', async () => {
      const result = await g.read({
        foo: { $key: { $last: 3, $until: 'd' }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
          { $key: { x: 'd' }, bar: 39 },
        ],
      });
    });
    test('first-until-since', async () => {
      const result = await g.read({
        foo: { $key: { $since: 'b', $until: 'g', $first: 2 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
        ],
      });
    });
    test('last-until-since', async () => {
      const result = await g.read({
        foo: { $key: { $since: 'a', $until: 'd', $last: 3 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
          { $key: { x: 'd' }, bar: 39 },
        ],
      });
    });
    test('first-until-since-filled', async () => {
      const result = await g.read({
        foo: { $key: { $since: 'b', $until: 'c', $first: 4 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
        ],
      });
    });
    test('last-until-since-filled', async () => {
      const result = await g.read({
        foo: { $key: { $since: 'b', $until: 'd', $last: 5 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [
          { $key: { x: 'b' }, bar: 41 },
          { $key: { x: 'c' }, bar: 40 },
          { $key: { x: 'd' }, bar: 39 },
        ],
      });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.onRead('foo', () => ({ x: { $ref: ['bar'] } }));
      g.onRead('bar', () => ({ baz: 3 }));
    });

    test('friendly', async () => {
      expect(await g.read({ foo: { x: { baz: 1 } } })).toEqual({
        foo: { x: { $ref: ['bar'], baz: 3 } },
      });
    });
  });
});
