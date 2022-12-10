import { jest } from '@jest/globals';
import Graffy from '@graffy/core';
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
        schema: { types: { id: 'uuid', name: 'text', updatedAt: 'int8' } },
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
    };
    const id = 'foo';
    await store.write('user.foo', data);
    expect(mockQuery).toBeCalled();

    const sqlQuery = sql`
      UPDATE "user" SET
        "name" = ${data.name},
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
      INSERT INTO "user" ("name", "id", "updatedAt")
      VALUES (${data.name}, ${'foo'}, default)
      ON CONFLICT ("id") DO UPDATE SET
      ("name", "id", "updatedAt") = (${data.name}, ${'foo'}, default)
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
      INSERT INTO "googleSession" ( "token", "userId", "version" )
      VALUES (${data.token}, ${'userId_01'}, default)
      ON CONFLICT ( "userId" )
      DO UPDATE SET ( "token", "userId", "version" ) =
      (${data.token}, ${'userId_01'}, default)
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

    await store.write(['googleSession', { userId: 'userId_01' }], data);
    const sqlQuery = sql`
      INSERT INTO "googleSession" ( "token" , "userId", "version" )
      VALUES ( ${data.token} , ${data.userId}, default) ON CONFLICT ("userId")
      DO UPDATE SET ( "token" ,"userId", "version" ) = 
        (${data.token}, ${data.userId}, default)
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
      INSERT INTO "email" ("tenantId", "userId", "id", "version" )
      VALUES (${data.tenantId}, ${data.userId}, ${'e1'}, default)
      ON CONFLICT ("id") DO UPDATE SET ("tenantId", "userId", "id", "version" ) =
        (${data.tenantId} , ${data.userId} , ${'e1'}, default)
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"`;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });
});
