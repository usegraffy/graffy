import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';
import { pg } from '../../index.js';
import { nowTimestamp } from '../../sql/clauses';

const mockQuery = jest.fn(() =>
  Promise.resolve({
    rowCount: 1,
    rows: [[{}]],
  }),
);

jest.mock('pg', () => ({
  __esModule: true,
  Pool: class {
    query = mockQuery;
  },
  Client: class {
    query = mockQuery;
  },
}));

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    store = new Graffy();
    store.use('user', pg({}));
    store.use(
      'googleSession',
      pg({
        table: 'googleSession',
        idCol: 'id',
        verCol: 'version',
      }),
    );

    store.use(
      'email',
      pg({
        table: 'email',
        idCol: 'id',
        verCol: 'version',
        links: {
          tenant: ['tenant', '$$tenantId'],
        },
      }),
    );
    store.use(
      'tenant',
      pg({
        table: 'tenant',
        idCol: 'id',
        verCol: 'version',
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
        "updatedAt" = ${nowTimestamp}
      WHERE "id" = ${id} LIMIT 1
      RETURNING ( to_jsonb ( "user" ) || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
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
      VALUES (${data.name}, ${'foo'}, ${nowTimestamp})
      ON CONFLICT ("id") DO UPDATE SET
      ("name", "id", "updatedAt") = (${data.name}, ${'foo'}, ${nowTimestamp})
      RETURNING ( to_jsonb ( "user" ) || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
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
      VALUES (${data.token}, ${'userId_01'},
        cast ( extract ( epoch from now ( ) ) as integer ) )
      ON CONFLICT ( "userId" )
      DO UPDATE SET ( "token", "userId", "version" ) =
      (${data.token}, ${'userId_01'},
        cast ( extract ( epoch from now ( ) ) as integer ) )
      RETURNING ( to_jsonb ( "googleSession" ) || jsonb_build_object ( '$key' , ${`{"userId":"userId_01"}`}::jsonb , '$ref' , jsonb_build_array(${`googleSession`}::text , "id") , '$ver' ,
        cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
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
     VALUES ( ${data.token} , ${
      data.userId
    }, cast ( extract ( epoch from now ( ) ) as integer ) ) ON CONFLICT ( "userId" )
     DO UPDATE SET ( "token" ,"userId", "version" ) = (  ${data.token}, ${
      data.userId
    }, cast ( extract ( epoch from now ( ) ) as integer ) )
     RETURNING ( to_jsonb ( "googleSession" ) || jsonb_build_object ( '$key' , ${`{"userId":"userId_01"}`}::jsonb , '$ref' , jsonb_build_array(${`googleSession`}::text , "id") , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
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
      VALUES (${data.tenantId}, ${data.userId}, ${'e1'},
      cast (extract (epoch from now() ) as integer ) )
      ON CONFLICT ("id") DO UPDATE SET ("tenantId", "userId", "id", "version" ) =
      ( ${data.tenantId} , ${data.userId} , ${'e1'},
      cast ( extract ( epoch from now() ) as integer ) )
      RETURNING ( to_jsonb ( "email" ) || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
    expectSql(mockQuery.mock.calls[0][0], sqlQuery);
  });
});
