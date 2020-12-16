import Graffy from '@graffy/core';
import stdDb from '../index.js';
import { populate } from './setup';

describe('rogue-db integration', () => {
  let store;

  beforeEach(async () => {
    await populate();
    jest.useFakeTimers();
    store = new Graffy();
    store.use('user', stdDb({ table: 'users' }));
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  test('scenario 1', async () => {
    const result1 = await store.read('user.user0', {
      updateTime: 1,
      type: 1,
      i: 1,
    });

    console.log('result1', result1);

    expect(result1).toEqual({
      i: 0,
      type: 'user',
      updateTime: expect.any(Number),
    });

    const stream1 = await store.watch('user.user1', {
      id: 1,
      i: 1,
    });
    jest.runOnlyPendingTimers();

    expect((await stream1.next()).value).toEqual({
      i: 1,
      id: { _val_: ['user1'] },
    });

    const response1 = await store.write('user.user1', {
      i: 2,
    });

    expect(response1).toEqual({ i: 2 });

    jest.runOnlyPendingTimers();

    expect((await stream1.next()).value).toEqual({
      i: 2,
      id: { _val_: ['user1'] },
    });
  });
});
