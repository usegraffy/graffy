import Grue from '.';

class MockProvider {
  init(grue) { this.grue = grue; }
  onGet(path, func) { this.grue.onGet(path, func); }
}

// describe('query', () => {
//   test('simple', async () => {
//     const g = new Grue();
//     g.use(new MockProvider());
//     const v = await g.get('foo', 1);
//     console.log('returned', v);
//   });
// });



describe('branch provider', () => {
  let g, p;
  beforeEach(() => {
    g = new Grue();
    p = new MockProvider();
    g.use('foo', p);
  });

  test('simple', async () => {
    p.onGet('/bar', () => Promise.resolve({ foo: { bar:42 }}));
    expect(await g.get({ foo: { bar: 1 }})).toEqual({ foo: { bar: 42 }});
  });

  test('overlap', async () => {
    p.onGet('foo', () => Promise.resolve({ foo: { baz: 15 }}));
    p.onGet('/bar', () => Promise.resolve({ foo: { bar:42 }}));
    expect(await g.get({ foo: { bar: 1, baz: 1 }}))
      .toEqual({ foo: { bar: 42, baz: 15 }});
  });

  test('prune', async () => {
    p.onGet('foo', () => Promise.resolve({ foo: { baz: 15, bar: 42 }}));
    expect(await g.get({foo: { bar: 1 }}))
      .toEqual({ foo: { bar: 42 }});
  });

  describe('range', () => {
    let resolver;
    beforeEach(() => {
      resolver = jest.fn();
      resolver.mockReturnValue({ foo: {
        a: { baz: 15, bar: 42 },
        b: { baz: 16, bar: 41 }
      }});
      p.onGet('/*', resolver);
    });

    test('all', async () => {
      const result = await g.get({ foo: { '*': { bar: 1 }}});
      expect(resolver).toBeCalledWith(['foo', { all: true }], { bar: 1 });
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { bar: 41 }}});
    });

    test('multi', async () => {
      const result = await g.get({ foo: { a: { bar: 1 }, b: { baz: 1 }}});
      expect(resolver).toBeCalledWith(['foo', ['a', 'b']], { bar: 1, baz: 1 });
      expect(result).toEqual({ foo: { a: { bar: 42 }, b: { baz: 16 }}});
    });
  });

  describe('link', () => {
    test('basic', async () => {
      p.onGet('foo', () => ({ foo: 'bar' }));
      p.onGet('bar', () => ({ bar: { baz: 3 }}));
      expect(await g.get({ foo: { baz: 1 }}))
        .toEqual({ foo: 'bar', bar: { baz: 3 } });
    });
  });
});
