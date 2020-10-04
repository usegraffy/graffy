import { selectByArgs } from './select.js';

test('example', async () => {
  expect(
    await selectByArgs(
      { first: 10 },
      { collection: 'object', prefix: ['object'] },
    ),
  ).toEqual([]);
});
