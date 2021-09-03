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
        "version" = ${nowTimestamp}
      WHERE "id" = ${id}
      RETURNING row_to_json ( user.* ) 
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
    const id = 'foo';
    client.query.mockReturnValueOnce({
      rowCount: 1,
    });
    const result = await store.write('user.foo', data);
    expect(client.query).toBeCalled();

    const expectedQuery = client.query.mock.calls[0][0];
    const version = expectedQuery.values[expectedQuery.values.length - 1];
    const sqlQuery = sql`
      INSERT INTO "user" ("id", "name", "version")
      VALUES (${id}, ${data.name}, ${version}) ON CONFLICT ("id") DO UPDATE SET
      ("name", "version") = (${data.name}, ${version})
      RETURNING row_to_json(user.*)
    `;
    expectSql(client.query.mock.calls[0][0], sqlQuery);

    expect(result).toEqual({
      name: 'Alice',
      $put: true,
    });
  });
});
