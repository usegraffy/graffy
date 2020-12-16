import { upsertToId } from './upsert.js';

jest.mock('./pool.js');

test.skip('example', async () => {
  await expect(
    async () =>
      await upsertToId(
        { id: ['post22'], type: 'post', name: 'hello', email: 'world' },
        { collection: 'object', indexes: [['email']] },
      ),
  ).not.toThrow();
});
