import Graffy from '@graffy/core';
import { pg } from '../index.js';
import { setupPgServer, teardownPgServer, populate, getPool } from './setup.js';

jest.setTimeout(30000);

describe('pg-e2e', () => {
  let store;

  beforeAll(async () => {
    await setupPgServer();
  });

  afterAll(async () => {
    await teardownPgServer();
  });

  beforeEach(async () => {
    await populate();
    store = new Graffy();
    store.use(
      'users',
      pg({
        table: 'users',
        id: 'id',
        version: 'version',
        connection: getPool(),
      }),
    );
  });

  test('read and write', async () => {
    const result1 = await store.read('users.user0', { name: true });
    expect(result1).toEqual({ name: 'name_0' });
    const response1 = await store.write('users.user1', {
      name: 'name_test',
    });
    expect(response1).toEqual({ name: 'name_test' });
  });
});
