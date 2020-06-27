import Graffy from '@graffy/core';
import Fill from '@graffy/fill';
import IndexWatcher from './index.js';
import { key, page, link, makeGraph } from '@graffy/common';
import { mockBackend } from '@graffy/testing';

const paramKey = key({ country: 'us' });

// const forever = new Promise(() => {});

describe('indexer', () => {
  let store;
  let users;

  beforeEach(() => {
    store = new Graffy();
    store.use(Fill());

    users = new mockBackend();
    store.use('/users', users.middleware);

    users.write(
      makeGraph(
        page({
          1: { name: 'Alice', country: 'us', timestamp: 104 },
          2: { name: 'Bob', country: 'us', timestamp: 100 },
          3: { name: 'Charles', country: 'us', timestamp: 107 },
          4: { name: 'Debra', country: 'eu', timestamp: 109 },
          5: { name: 'Edmond', country: 'eu', timestamp: 103 },
        }),
        0,
      ),
    );

    // console.log(debug(users.state));

    store.use(
      '/users$',
      IndexWatcher(
        '/users',
        { name: true, country: true, timestamp: true },
        (user, params) => {
          if (user.country !== params.country) return; // No keys.
          return [user.timestamp];
        },
      ),
    );

    store.on('read', ['users$'], () => {
      const results = {};
      for (const { key: id, end, children } of users.state) {
        if (end || children[0].value !== 'us') continue;
        results[key(children[2].value)] = link(['users', id]);
      }
      return makeGraph({ [paramKey]: page(results) }, 0);
    });

    // console.log(store.core.handlers.watch);
  });

  test('initial', async () => {
    const stream = store.watch(
      ['users$', paramKey],
      [{ first: 2 }, { name: true, country: true, timestamp: true }],
    );

    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Alice', country: 'us', timestamp: 104 },
    ]);
  });

  test('keyChangeIn', async () => {
    const stream = store.watch(
      ['users$', paramKey],
      [{ first: 2 }, { name: true, country: true, timestamp: true }],
    );

    await stream.next();
    users.write(makeGraph({ 3: { timestamp: 101 } }, 1));
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Charles', country: 'us', timestamp: 101 },
    ]);
  });

  test('keyChangeOut', async () => {
    const stream = store.watch(
      ['users$', paramKey],
      [{ first: 2 }, { name: true, country: true, timestamp: true }],
    );

    await stream.next();
    users.write(makeGraph({ 1: { timestamp: 115 } }, 10));
    await stream.next(); // TODO: Fix this duplicate initialization.
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Charles', country: 'us', timestamp: 107 },
    ]);
  });

  test('keyReorder forwards', async () => {
    const stream = store.watch(
      ['users$', paramKey],
      [{ name: true, timestamp: true }],
    );
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', timestamp: 100 },
      { name: 'Alice', timestamp: 104 },
      { name: 'Charles', timestamp: 107 },
    ]);
    users.write(makeGraph({ 1: { timestamp: 110 } }));
    await stream.next();
    await stream.next();
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', timestamp: 100 },
      { name: 'Charles', timestamp: 107 },
      { name: 'Alice', timestamp: 110 },
    ]);
  });

  test('keyReorder backwards', async () => {
    const stream = store.watch(
      ['users$', paramKey],
      [{ name: true, timestamp: true }],
    );
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', timestamp: 100 },
      { name: 'Alice', timestamp: 104 },
      { name: 'Charles', timestamp: 107 },
    ]);
    users.write(makeGraph({ 1: { timestamp: 91 } }));
    await stream.next();
    await stream.next();
    expect((await stream.next()).value).toEqual([
      { name: 'Alice', timestamp: 91 },
      { name: 'Bob', timestamp: 100 },
      { name: 'Charles', timestamp: 107 },
    ]);
  });

  // TODO: filterChangeIn, filterChangeOut,
  // createIn, createOutRange, createOutFilter,
  // deleteIn, deleteOutRange, deleteOutFilter
});
