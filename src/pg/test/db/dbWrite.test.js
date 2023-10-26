import Graffy from '@graffy/core';
import { jest } from '@jest/globals';
import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';

/**
 * Jest type definition incorrectly says mock.calls
 * must be an empty array.
 *
 * @type {(() => Promise<any>) & {
 *  mock: { calls: any[][] },
 *  mockClear: () => void
 * }}
 */
const mockQuery = jest.fn(() =>
  Promise.resolve({
    rowCount: 1,
    rows: [{}],
  }),
);

jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: class {
      query = mockQuery;
    },
    Client: class {
      query = mockQuery;
    },
  },
}));

const { pg } = await import('../../index.js');

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    store = new Graffy();
    store.use(
      'user',
      pg({
        schema: {
          types: {
            id: 'uuid',
            name: 'text',
            updatedAt: 'int8',
            quantities: 'cube',
          },
        },
        verDefault: 'current_timestamp',
      }),
    );
    store.use(
      'googleSession',
      pg({
        table: 'googleSession',
        idCol: 'id',
        verCol: 'version',
        schema: { types: { userId: 'uuid', token: 'text', version: 'int8' } },
        verDefault: 'current_timestamp',
      }),
    );

    store.use(
      'email',
      pg({
        table: 'email',
        idCol: 'id',
        verCol: 'version',
        schema: {
          types: {
            id: 'uuid',
            userId: 'uuid',
            tenantId: 'uuid',
            version: 'int8',
          },
        },
        verDefault: 'current_timestamp',
      }),
    );
    store.use(
      'tenant',
      pg({
        table: 'tenant',
        idCol: 'id',
        verCol: 'version',
        schema: { types: {} },
        verDefault: 'current_timestamp',
      }),
    );
  });

  afterEach(async () => {
    mockQuery.mockClear();
  });

  test('patch_by_id', async () => {
    const data = {
      name: 'Alice',
      quantities: [100000, 75000, 0],
    };
    const id = 'foo';
    await store.write('user.foo', data);
    expect(mockQuery).toBeCalled();

    const sqlQuery = sql`
      UPDATE "user" SET
        "name" = ${data.name},
        "quantities" = cube ( array[${100000} , ${75000} , ${0}]::float8[] ) ,
        "updatedAt" = default
      WHERE "id" = ${id}
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });

  test('put_by_id_1', async () => {
    const data = {
      name: 'Alice',
      $put: true,
    };
    await store.write('user.foo', data);
    expect(mockQuery).toBeCalled();

    const sqlQuery = sql`
      INSERT INTO "user" ("id", "name", "updatedAt")
      VALUES (${'foo'}, ${data.name}, default)
      ON CONFLICT ("id") DO UPDATE SET
      "id" = "excluded"."id", "name" = "excluded"."name", "updatedAt" = "excluded"."updatedAt"
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });

  test('put_by_args_1', async () => {
    const data = {
      $key: { userId: 'userId_01' },
      token: 'test',
      $put: true,
    };

    await store.write('googleSession', data);
    const sqlQuery = sql`
      INSERT INTO "googleSession" ( "userId", "token", "version" )
      VALUES (${'userId_01'}, ${data.token}, default)
      ON CONFLICT ( "userId" )
      DO UPDATE SET "userId" = "excluded"."userId", "token" = "excluded"."token", "version" = "excluded"."version"
      RETURNING *,
        ${`{"userId":"userId_01"}`}::jsonb AS "$key" ,
        current_timestamp AS "$ver",
        array[ ${'googleSession'}::text , "id" ]::text[] AS "$ref"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });

  test('put_by_args_2', async () => {
    const data = {
      userId: 'userId_01',
      token: 'test',
      $put: true,
    };

    mockQuery.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ foo: true }],
    });

    await store.write(['googleSession', { userId: 'userId_01' }], data);
    const sqlQuery = sql`
      INSERT INTO "googleSession" (  "userId", "token", "version" )
      VALUES (  ${data.userId}, ${data.token}, default) ON CONFLICT ("userId")
      DO UPDATE SET "userId" = "excluded"."userId", "token" = "excluded"."token", "version" = "excluded"."version"
      RETURNING *,
        ${`{"userId":"userId_01"}`}::jsonb AS "$key" ,
        current_timestamp AS "$ver",
        array[ ${'googleSession'}::text , "id" ]::text[] AS "$ref"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });

  test('put_by_id_2', async () => {
    const data = {
      userId: 'userId_01',
      tenantId: 't1',
      $put: true,
    };

    await store.write('email.e1', data);
    const sqlQuery = sql`
      INSERT INTO "email" ("id", "userId", "tenantId", "version" )
      VALUES (${'e1'}, ${data.userId}, ${data.tenantId}, default)
      ON CONFLICT ("id") DO UPDATE SET "id" = "excluded"."id", "userId" = "excluded"."userId", "tenantId" = "excluded"."tenantId", "version" = "excluded"."version" 
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });
});
