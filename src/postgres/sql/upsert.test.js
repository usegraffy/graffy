import { upsertToId } from './upsert.js';

test('example', async () => {
  await expect(
    async () =>
      await upsertToId(
        { id: 'post21', type: 'post', name: 'hello' },
        { table: 'object' },
      ),
  ).not.toThrow();
});
