import Graffy from '@graffy/core';
import pg from '../index.js';
import { populate } from './setup';

import debug from 'debug';
const log = debug('graffy:pg:test');

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    await populate();
    jest.useFakeTimers();
    store = new Graffy();
    store.use(
      'user',
      pg({
        table: 'users',
        columns: {
          id: { role: 'primary' },
          tags: { role: 'gin' },
          data: { role: 'default' },
          version: { role: 'version' },
        },
        links: { posts: { target: 'post', back: 'author' } },
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('scenario 1', async () => {
    const result1 = await store.read('user.user0', { i: 1 });

    expect(result1).toEqual({ i: 0 });

    const stream1 = await store.watch('user.user1', {
      id: 1,
      i: 1,
    });
    jest.runOnlyPendingTimers();

    expect((await stream1.next()).value).toEqual({
      i: 1,
      id: 'user1',
    });

    const response1 = await store.write('user.user1', {
      i: 2,
    });

    expect(response1).toEqual({ i: 2 });

    log('Before timer');

    jest.runOnlyPendingTimers();

    log('After timer');

    expect((await stream1.next()).value).toEqual({
      i: 2,
      id: 'user1',
    });
  });
});
