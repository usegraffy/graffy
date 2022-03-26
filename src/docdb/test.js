import Graffy from '@graffy/core';
import DocDB from './index.js';

describe('final', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(
      DocDB({
        collections: ['user', 'post'],
        links: [{ from: 'post', link: 'author', to: 'user', back: 'posts' }],
      }),
    );
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
