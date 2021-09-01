import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../../index.js';
import expectSql from '../expectSql';
// import { populate } from './setup.js';

// import debug from 'debug';
import pool from '../../pool.js';

jest.mock('../../pool', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };

  const mockPool = {
    __esModule: true,
    default: {
      select: jest.fn(),
      connect: jest.fn(() => mockClient),
      mockClient,
    },
  };

  return mockPool;
});

// const log = debug('graffy:pg:test');

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    jest.useFakeTimers();

    store = new Graffy();
    store.use(
      'user',
      graffyPg({
        table: 'user',
        id: 'id',
        version: 'version',
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    pool.select.mockReset();
  });

  test('id_lookup', async () => {
    const now = Date.now();
    pool.select.mockReturnValueOnce([
      { id: 'foo', name: 'Alice', version: now },
    ]);
    const result = await store.read('user.foo', {
      name: true,
      version: true,
    });
    expect(pool.select).toBeCalled();
    expectSql(
      pool.select.mock.calls[0][0],
      sql`
      SELECT * 
      FROM "user" WHERE "id" IN (${'foo'})
    `,
    );
    expect(result).toEqual({
      name: 'Alice',
      version: now,
    });
  });

  test.skip('email_lookup', async () => {
    pool.query.mockReturnValueOnce({
      rows: [
        [{ $key: { email: 'alice@example.com' }, id: 'foo', name: 'Alice' }],
      ],
    });
    const result = await store.read(['user'], {
      $key: { email: 'alice@example.com' },
      name: true,
    });
    expect(pool.query).toBeCalled();
    expectSql(
      pool.query.mock.calls[0][0],
      sql`
      SELECT
        "data" || jsonb_build_object( 'id', "id", 'createdAt', "createdAt" ) ||
        jsonb_build_object( '$key', ${JSON.stringify({
          email: 'alice@example.com',
        })}::jsonb, '$ref', array[${'user'}, "id"], '$ver', now() )
      FROM "users"
      WHERE "tags" #>> '{"${'email'}"}' = ${'alice@example.com'}
      LIMIT ${1}
    `,
    );
    expect(result).toEqual([
      {
        $key: { email: 'alice@example.com' },
        name: 'Alice',
      },
    ]);
  });

  test.skip('range_lookup', async () => {
    pool.query.mockReturnValueOnce({
      rows: [
        [
          {
            $key: { $order: ['createdAt', 'id'], $cursor: [536, 'foo'] },
            $ref: ['user', 'foo'],
            id: 'foo',
            name: 'Alice',
          },
        ],
        [
          {
            $key: { $order: ['createdAt', 'id'], $cursor: [723, 'bar'] },
            $ref: ['user', 'bar'],
            id: 'bar',
            name: 'Bob',
          },
        ],
      ],
    });
    const result = await store.read(['user'], {
      $key: { $order: ['createdAt', 'id'], $first: 2 },
      name: true,
    });
    expect(pool.query).toBeCalled();
    expectSql(
      pool.query.mock.calls[0][0],
      sql`SELECT
        "data" || jsonb_build_object( 'id', "id", 'createdAt', "createdAt" ) ||
        jsonb_build_object(
          '$key', (jsonb_build_object(
            '$order', jsonb_build_array(${'createdAt'},${'id'})
          ) || jsonb_build_object (
            '$cursor', jsonb_build_array ( \"createdAt\", \"id\" )
          )),
          '$ref', array[${'user'}, "id"], '$ver', now()
        )
      FROM "users"
      ORDER BY "createdAt" ASC, "id" ASC
      LIMIT ${2}`,
    );
    expect(result).toEqual([
      {
        $key: { $cursor: [536, 'foo'], $order: ['createdAt', 'id'] },
        $ref: ['user', 'foo'],
        name: 'Alice',
      },
      {
        $key: { $cursor: [723, 'bar'], $order: ['createdAt', 'id'] },
        $ref: ['user', 'bar'],
        name: 'Bob',
      },
    ]);
  });
});
