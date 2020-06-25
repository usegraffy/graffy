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

// describe('expiry', () => {});

describe('optimism', () => {
  let store;
  let watchProvider, writeProvider;
  let state = 42;

  beforeEach(() => {
    store = new Graffy();
    store.use(Cache());
    watchProvider = jest.fn(async function* () {
      yield { foo: state };
    });
    writeProvider = jest.fn(({ foo }) => {
      state = foo + 1;
      return { foo: foo + 1 };
    });
    store.onWatch(watchProvider);
    store.onWrite(writeProvider);
  });

  test('basic', async () => {
    const stream = store.watch({ foo: true });
    expect((await stream.next()).value).toEqual({ foo: 42 });
    expect(await store.read({ foo: true })).toEqual({ foo: 42 });

    store.write({ foo: 10 }, { optimism: true });
    expect(await store.read({ foo: true })).toEqual({ foo: 10 });
    expect((await stream.next()).value).toEqual({ foo: 10 });
    expect(await store.read({ foo: true })).toEqual({ foo: 11 });
    expect((await stream.next()).value).toEqual({ foo: 11 });
  });
});
