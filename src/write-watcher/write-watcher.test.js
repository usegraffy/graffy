import Graffy from '@graffy/core';
import WriteWatcher from './index.js';

describe('final', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(WriteWatcher({ final: true }));
    store.onWrite((change) => change);
  });

  test('simple', async () => {
    let stream = store.watch({ foo: 1 });
    expect((await stream.next()).value).toEqual(undefined);
    store.write({ foo: 42 });
    expect((await stream.next()).value).toEqual({ foo: 42 });
  });
});

const forever = new Promise(() => {});

describe('nonfinal', () => {
  let store;

  beforeEach(() => {
    store = new Graffy();
    store.use(WriteWatcher());
    store.onWrite((change) => change);
    store.onWatch(async function* () {
      yield { foo: 100 };
      await forever;
    });
  });

  test('simple', async () => {
    let stream = store.watch({ foo: 1 });
    expect((await stream.next()).value).toEqual({ foo: 100 });
    store.write({ foo: 42 });
    expect((await stream.next()).value).toEqual({ foo: 42 });
  });
});
