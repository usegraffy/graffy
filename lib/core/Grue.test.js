import Grue from '.';

// describe('query', () => {
//   test('simple', async () => {
//     const g = new Grue();
//     g.use(new MockProvider());
//     const v = await g.get('foo', 1);
//     console.log('returned', v);
//   });
// });



describe('branch provider', () => {
  let g;
  beforeEach(() => {
    g = new Grue();
  });

  test('simple', async () => {
    g.use('/foo', grue => {
      grue.onGet('/bar', () => Promise.resolve({ bar:42 }));
    });
    expect(await g.get({ foo: { bar: 1 }})).toEqual({ foo: { bar: 42 }});
  });

  test('overlap', async () => {
    g.use('/foo', grue => {
      grue.onGet('/baz', () => Promise.resolve({ baz: 15 }));
      grue.onGet('/bar', () => Promise.resolve({ bar: 42 }));
    });
    expect(await g.get({ foo: { bar: 1, baz: 1 }}))
      .toEqual({ foo: { bar: 42, baz: 15 }});
  });

  test('prune', async () => {
    g.use(grue => {
      grue.onGet('/foo', () => Promise.resolve({ foo: { baz: 15, bar: 42 }}));
    });
    expect(await g.get({foo: { bar: 1 }}))
      .toEqual({ foo: { bar: 42 }});
  });

  describe('range', () => {
    let resolver;
    const anyFn = expect.any(Function);
    beforeEach(() => {
      resolver = jest.fn();
      resolver.mockReturnValue({ foo: {
        a: { baz: 15, bar: 42 },
        b: { baz: 16, bar: 41 }
      }});
      g.use(grue => {
        grue.onGet(resolver);
      });
    });

    test('all', async () => {
      const result = await g.get({ foo: { '*': { bar: 1 }}});
      expect(resolver).toBeCalledWith(
        { shape: { foo: { '*': { bar: 1 } } } },
        anyFn
      );
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { bar: 41 }}});
    });

    test('multi', async () => {
      const result = await g.get({ foo: { a: { bar: 1 }, b: { baz: 1 }}});
      expect(resolver).toBeCalledWith(
        { shape: { foo: { a: { bar: 1 }, b: { baz: 1 } } } },
        anyFn
      );
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { baz: 16 }}});
    });
  });

  describe('link', () => {
    beforeEach(() => {
      g.use(grue => {
        grue.onGet('/foo', () => ({ foo: '/bar' }));
        grue.onGet('/bar', () => ({ bar: { baz: 3 }}));
      });
    });

    test('keepLinks', async () => {
      expect(await g.get({ foo: { baz: 1 }}, {keepLinks: true}))
        .toEqual({ foo: '/bar', bar: { baz: 3 } });
    });

    test('graftLinks', async () => {
      expect(await g.get({ foo: { baz: 1 }}))
        .toEqual({ foo: { baz: 3 } });
    });
  });
});
