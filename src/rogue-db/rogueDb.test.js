import Graffy from '@graffy/core';
import rogueDb from './index.js';
import { populate } from './setup';

describe('rogue-db integration', () => {
  let store;

  beforeEach(async () => {
    await populate();
    store = new Graffy();
    store.use('user', rogueDb({ collection: 'user' }));
  });

  test('scenario 1', async () => {
    const result1 = await store.read('user.user0', {
      updateTime: 1,
      type: 1,
      i: 1,
    });

    expect(result1).toEqual({
      i: 0,
      type: 'user',
      updateTime: expect.any(Number),
    });

    const stream1 = await store.watch('user.user1', {
      id: 1,
      i: 1,
    });

    expect((await stream1.next()).value).toEqual({ i: 1, id: ['user1'] });

    const response1 = await store.write('user.user1', {
      i: 2,
    });

    expect(response1).toEqual({ i: 2 });

    console.log('Completed write');

    expect((await stream1.next()).value).toEqual({ i: 2, id: ['user1'] });
  });
});
