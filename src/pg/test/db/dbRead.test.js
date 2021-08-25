/* eslint-disable no-unused-labels */
/* eslint-disable no-empty */
import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import graffyPg from '../../index.js';
// import { populate } from './setup.js';
import expectSql from '../../sql/expectSql.js';

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
      connect: jest.fn(() => mockClient),
      select: jest.fn(),
      mockClient,
      loadSchema: (_) => undefined,
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
        table: 'users',
        columns: {
          id: { role: 'primary' },
          tags: { role: 'gin', props: ['email', 'phone'] },
          data: { role: 'default' },
          createdAt: { role: 'simple' },
          version: { role: 'version' },
        },
        links: { posts: { target: 'post', back: 'author' } },
      }),
    );
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    pool.select.mockReset();
  });

  test('id_lookup', async () => {
    pool.select.mockReturnValueOnce([
      [{ $key: 'foo', id: 'foo', name: 'Alice' }],
    ]);
    const result = await store.read('user.foo', {
      name: true,
    });
    expect(pool.select).toBeCalled();
    expectSql(
      pool.select.mock.calls[0][0],
      sql`
      SELECT
        "data" || jsonb_build_object( 'id', "id", 'createdAt', "createdAt" ) ||
        jsonb_build_object( '$key', "id", '$ver', cast ( extract ( epoch from now ( ) ) as integer ) )
      FROM "users" WHERE "id" IN (${'foo'})
    `,
    );
    expect(result).toEqual({
      name: 'Alice',
    });
  });

  test.skip('email_lookup', async () => {
    pool.select.mockReturnValueOnce({
      rows: [
        [{ $key: { email: 'alice@example.com' }, id: 'foo', name: 'Alice' }],
      ],
    });
    const result = await store.read(['user'], {
      $key: { email: 'alice@example.com' },
      name: true,
    });
    expect(pool.select).toBeCalled();
    expectSql(
      pool.select.mock.calls[0][0],
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
    pool.select.mockReturnValueOnce({
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
    expect(pool.select).toBeCalled();
    expectSql(
      pool.select.mock.calls[0][0],
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
