import Graffy from '@graffy/core';
import Cache from './index.js';

describe('cache', () => {
  let store;
  let provider;

  beforeEach(() => {
    store = new Graffy();
    store.use(Cache());
    provider = jest.fn(() => ({ foo: 42 }));
    store.onRead(provider);
  });

  test('simple', async () => {
    const result1 = await store.read({ foo: 1 });
    expect(result1).toEqual({ foo: 42 });
    expect(provider).toBeCalledTimes(1);
    const result2 = await store.read({ foo: 1 });
    expect(result2).toEqual({ foo: 42 });
    expect(provider).toBeCalledTimes(1);
  });
});

describe('final', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(Cache({ final: true }));
    store.onRead(() => {
      throw Error();
    });
    store.write({ foo: 42 });
  });

  test('simple', async () => {
    const result = await store.read({ foo: 1, bar: 1 });
    expect(result).toEqual({ foo: 42, bar: null });
  });

  test('watch', async () => {
    const result = store.watch({ foo: 1 });
    expect((await result.next()).value).toEqual(undefined);
    store.write({ foo: 44 });
    expect((await result.next()).value).toEqual({ foo: 44 });
  });

  test('range', async () => {
    const result = await store.read([{ first: 3 }, 1]);
    expect(result).toEqual([42]);
  });
});
