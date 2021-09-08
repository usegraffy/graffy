import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';
import pg from '../../index.js';
import { nowTimestamp } from '../../sql/helper.js';

const client = {
  query: jest.fn(),
};

describe('postgres', () => {
  let store;

  beforeEach(async () => {
    jest.useFakeTimers();

    const graffyPg = pg({
      client,
      opts: {
        id: 'id',
        version: 'version',
      },
    });
    store = new Graffy();
    store.use('user', graffyPg);
  });

  afterEach(async () => {
    jest.clearAllTimers();
    jest.useRealTimers();
    client.query.mockReset();
  });

  test('patch_by_id', async () => {
    const data = {
      name: 'Alice',
    };
    const id = 'foo';
    client.query.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', data);
    expect(client.query).toBeCalled();

    const sqlQuery = sql`
      UPDATE "user" SET
        "name" = ${data.name},
        "updatedAt" = ${nowTimestamp}
      WHERE "id" = ${id}
      RETURNING ( to_jsonb ( "user" ) || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
    expectSql(client.query.mock.calls[0][0], sqlQuery);
    expect(result).toEqual({
      name: 'Alice',
    });
  });

  test('with $put (insert on conflict)', async () => {
    const data = {
      name: 'Alice',
      $put: true,
    };
    client.query.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', data);
    expect(client.query).toBeCalled();

    const sqlQuery = sql`
      INSERT INTO "user" ("name", "updatedAt")
      VALUES (${data.name}, ${nowTimestamp}) ON CONFLICT ("id") DO UPDATE SET
      ("name", "updatedAt\") = (${data.name}, ${nowTimestamp})
      RETURNING ( to_jsonb ( "user" ) || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) ) )
    `;
    expectSql(client.query.mock.calls[0][0], sqlQuery);

    expect(result).toEqual({
      name: 'Alice',
      $put: true,
    });
  });
});
