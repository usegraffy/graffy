import { upsertToId } from './upsert.js';

test('example', async () => {
  await expect(
    async () =>
      await upsertToId(
        { id: ['post22'], type: 'post', name: 'hello', email: 'world' },
        { collection: 'object', indexes: [['email']] },
      ),
  ).not.toThrow();
});
