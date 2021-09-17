import Graffy from '@graffy/core';
import { pg } from '../index.js';
import {
  setupPgServer,
  teardownPgServer,
  resetTables,
  getPool,
} from './setup.js';

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
    await resetTables();
    store = new Graffy();
    store.use(
      'users',
      pg({
        table: 'users',
        idCol: 'id',
        verCol: 'version',
        connection: getPool(),
      }),
    );
  });

  test('read and write', async () => {
    const res1 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alice',
      email: 'alice@acme.co',
      $put: true,
    });

    expect(res1).toEqual({
      $key: { email: 'alice@acme.co' },
      $ref: ['users', expect.any(String)],
      // name: 'Alice', // TODO: Fix the returning clause
    });

    const id = res1.$ref[1];

    const res2 = await store.read(['users'], {
      $key: { $first: 10, email: { $not: null } },
      id: true,
      name: true,
      email: true,
    });

    const expected = [
      {
        $key: { $cursor: [id], email: { $not: null } },
        $ref: ['users', id],
        id: id,
        name: 'Alice',
        email: 'alice@acme.co',
      },
    ];
    expected.$page = { $all: true, email: { $not: null } };
    expected.$next = null;
    expected.$prev = null;
    expect(res2).toEqual(expected);

    // const result1 = await store.read('users.user0', { name: true });
    // expect(result1).toEqual({ name: 'name_0' });
    // const response1 = await store.write('users.user1', {
    //   name: 'name_test',
    // });
    // expect(response1).toEqual({ name: 'name_test' });
  });
});
