import Graffy from '../Graffy';
import fill from '@graffy/fill';
import { encodeValue as key } from '@graffy/common';
// import { merge } from '@graffy/common';

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
          foo: {
            ['\0' + key('a')]: { baz: 15, bar: 42 },
            ['\0' + key('b')]: { baz: 16, bar: 41 },
            ['\0' + key('c')]: { baz: 17, bar: 40 },
            ['\0' + key('d')]: { baz: 18, bar: 39 },
            ['\0' + key('e')]: { baz: 19, bar: 38 },
          },
        };
      });
      g.onRead(provider);
    });

    test('all', async () => {
      const result = await g.read({
        foo: { _key_: {}, bar: 1 },
      });
      expect(provider).toBeCalledWith({ foo: [{}, { bar: true }] }, {});
      expect(result).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }, { bar: 40 }, { bar: 39 }, { bar: 38 }],
      });
    });

    test('first', async () => {
      const result = await g.read({ foo: { _key_: { first: 2 }, bar: 1 } });
      expect(result).toEqual({
        foo: [{ bar: 42 }, { bar: 41 }],
      });
    });
    test('last', async () => {
      const result = await g.read({ foo: { _key_: { last: 1 }, bar: 1 } });
      expect(result).toEqual({ foo: [{ bar: 38 }] });
    });
    test('first-since', async () => {
      const result = await g.read({
        foo: { _key_: { first: 2, since: 'b' }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-until', async () => {
      const result = await g.read({
        foo: { _key_: { last: 3, until: 'd' }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-until-since', async () => {
      const result = await g.read({
        foo: { _key_: { since: 'b', until: 'g', first: 2 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-until-since', async () => {
      const result = await g.read({
        foo: { _key_: { since: 'a', until: 'd', last: 3 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });
    test('first-until-since-filled', async () => {
      const result = await g.read({
        foo: { _key_: { since: 'b', until: 'c', first: 4 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }],
      });
    });
    test('last-until-since-filled', async () => {
      const result = await g.read({
        foo: { _key_: { since: 'b', until: 'd', last: 5 }, bar: 1 },
      });
      expect(result).toEqual({
        foo: [{ bar: 41 }, { bar: 40 }, { bar: 39 }],
      });
    });

    test('multi', async () => {
      const result = await g.read({
        foo: { ['\0' + key('a')]: { bar: 1 }, ['\0' + key('b')]: { baz: 1 } },
      });
      expect(provider).toBeCalledWith(
        {
          foo: {
            ['\0' + key('a')]: { bar: true },
            ['\0' + key('b')]: { baz: true },
          },
        },
        {},
      );
      expect(result).toEqual({
        foo: [{ bar: 42 }, { baz: 16 }],
      });
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.onRead('foo', () => ({ x: { _ref_: ['bar'] } }));
      g.onRead('bar', () => ({ baz: 3 }));
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
