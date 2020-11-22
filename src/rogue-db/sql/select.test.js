import { selectByArgs } from './select.js';

jest.mock('./pool.js');

test.skip('example', async () => {
  expect(
    await selectByArgs(
      { first: 10 },
      { collection: 'object', prefix: ['object'] },
    ),
  ).toEqual([]);
});
