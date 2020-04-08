import Graffy from '@graffy/core';
import Fill from '@graffy/fill';
import IndexWatcher from './index.js';
import { key, page, link } from '@graffy/common';
import { mockBackend } from '@graffy/testing';

const paramKey = key({ country: 'us' });

const forever = new Promise(() => {});

describe.skip('indexer', () => {
  let store;
  let users;
  let stream;

  beforeEach(() => {
    store = new Graffy();
    store.use(Fill());

    users = new mockBackend();
    store.use('/users', users);

    users.write({
      1: { name: 'Alice', country: 'us', timestamp: 104 },
      2: { name: 'Bob', country: 'us', timestamp: 100 },
      3: { name: 'Charles', country: 'us', timestamp: 107 },
      4: { name: 'Debra', country: 'eu', timestamp: 109 },
      5: { name: 'Edmond', country: 'eu', timestamp: 103 },
    });

    store.use(
      '/users$',
      IndexWatcher('/users', (user, params, emit) => {
        if (user.country !== params.country) return; // No keys.
        emit(user.timestamp);
      }),
    );

    store.onRead('/users$', () => ({
      paramKey: page({
        100: link('/users/2'),
        104: link('/users/1'),
        107: link('/users/3'),
      }),
    }));

    stream = store.watch(
      ['user$', paramKey],
      [{ first: 2 }, { name: true, country: true, timestamp: true }],
    );
  });

  test('initial', async () => {
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Alice', country: 'us', timestamp: 104 },
    ]);
  });

  test('keyChangeIn', async () => {
    users.write({ 3: { timestamp: 101 } });
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Charles', country: 'us', timestamp: 101 },
    ]);
  });

  test('keyChangeOut', async () => {
    users.write({ 1: { timestamp: 115 } });
    expect((await stream.next()).value).toEqual([
      { name: 'Bob', country: 'us', timestamp: 100 },
      { name: 'Charles', country: 'us', timestamp: 107 },
    ]);
  });

  // TODO: filterChangeIn, filterChangeOut,
  // createIn, createOutRange, createOutFilter,
  // deleteIn, deleteOutRange, deleteOutFilter
});
