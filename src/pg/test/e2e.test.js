import { v4 as uuid } from 'uuid';
import Graffy from '@graffy/core';
import { pg } from '../index.js';
import {
  setupPgServer,
  teardownPgServer,
  resetTables,
  getPool,
} from './setup.js';

const uuidV4Regex =
  /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i;

jest.setTimeout(30000);

describe('pg_e2e', () => {
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

  test('scenario_1', async () => {
    // First, upsert Alice user (it should do an insert)
    const res1 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alice',
      $put: true,
    });

    expect(res1).toEqual({
      $key: { email: 'alice@acme.co' },
      $ref: ['users', expect.any(String)],
      // name: 'Alice', // TODO: Fix the returning clause
    });

    const id1 = res1.$ref[1];
    expect(id1).toMatch(uuidV4Regex);

    // Second, read "all users with email addresses"
    // from the database, and verify the list.
    const res2 = await store.read(['users'], {
      $key: { $first: 10, email: { $not: null } },
      id: true,
      name: true,
      email: true,
    });

    const exp2 = [
      {
        $key: { $cursor: [id1], email: { $not: null } },
        $ref: ['users', id1],
        id: id1,
        name: 'Alice',
        email: 'alice@acme.co',
      },
    ];
    exp2.$page = { $all: true, email: { $not: null } };
    exp2.$next = null;
    exp2.$prev = null;
    expect(res2).toEqual(exp2);

    // Third, upsert the same name person again with the name `Alice example`.
    const res3 = await store.write(['users', { email: 'alice@acme.co' }], {
      name: 'Alicia',
      $put: true,
    });

    expect(res3).toEqual({
      $key: { email: 'alice@acme.co' },
      $ref: ['users', id1], // The ID should be unchanged
      // name: 'Alice Example',

      // Ideally, the current object should be echoed here.
      // However, it gets stripped out by the store.write()
      // unwrap result step. TODO: inter-link data before
      // unwrap.
    });

    // Fourth, put a user Alan using a client-generated ID
    const id2 = uuid();
    const res4 = await store.write(['users', id2], {
      name: 'alan',
      email: 'alan@acme.co',
      $put: true,
    });

    expect(res4).toEqual({
      id: id2,
      name: 'alan',
      email: 'alan@acme.co',
      settings: null,
      version: expect.any(Number),
    });

    // Fifth, get all users with names starting with "al" (case insensitive)
    // with case-insensitive sorting

    const res5 = await store.read(['users'], {
      $key: { $first: 10, name: { $ire: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
    });

    const exp5 = [
      {
        $key: {
          $cursor: ['Alicia', id1],
          name: { $ire: '^al' },
          $order: ['name', 'id'],
        },
        $ref: ['users', id1],
        id: id1,
        name: 'Alicia',
        email: 'alice@acme.co',
      },
      {
        $key: {
          $cursor: ['alan', id2],
          name: { $ire: '^al' },
          $order: ['name', 'id'],
        },
        $ref: ['users', id2],
        id: id2,
        name: 'alan',
        email: 'alan@acme.co',
      },
    ];
    exp5.$page = {
      $all: true,
      name: { $ire: '^al' },
      $order: ['name', 'id'],
    };
    exp5.$next = null;
    exp5.$prev = null;
    expect(res5).toEqual(exp5);

    // Sixth, get all users with names starting with "al" (case sensitive)

    const res6 = await store.read(['users'], {
      $key: { $first: 10, name: { $re: '^al' }, $order: ['name', 'id'] },
      id: true,
      name: true,
      email: true,
    });

    const exp6 = [
      {
        $key: {
          $cursor: ['alan', id2],
          name: { $re: '^al' },
          $order: ['name', 'id'],
        },
        $ref: ['users', id2],
        id: id2,
        name: 'alan',
        email: 'alan@acme.co',
      },
    ];
    exp6.$page = {
      $all: true,
      name: { $re: '^al' },
      $order: ['name', 'id'],
    };
    exp6.$next = null;
    exp6.$prev = null;
    expect(res6).toEqual(exp6);
  });
});
