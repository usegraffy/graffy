import { Grue, GET } from '.';

describe('query', () => {
  let g;
  beforeEach(() => { g = new Grue(); });

  test('simple', async () => {
    g.register('foo/bar', GET, () => Promise.resolve({ foo: { bar:42 }}));
    expect(await g.get({ foo: { bar: 1 }})).toEqual({ foo: { bar: 42 }});
  });

  test('overlap', async () => {
    g.register('foo', GET, () => Promise.resolve({ foo: { baz: 15 }}));
    g.register('foo/bar', GET, () => Promise.resolve({ foo: { bar:42 }}));
    expect(await g.get({ foo: { bar: 1, baz: 1 }}))
      .toEqual({ foo: { bar: 42, baz: 15 }});
  });

  test('prune', async () => {
    g.register('foo', GET, () => Promise.resolve({ foo: { baz: 15, bar: 42 }}));
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
      g.register('foo/*', GET, resolver);
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
      g.register('foo', GET, () => ({ foo: 'bar' }));
      g.register('bar', GET, () => ({ bar: { baz: 3 }}));
      expect(await g.get({ foo: { baz: 1 }}))
        .toEqual({ foo: 'bar', bar: { baz: 3 } });
    });
  });
});
