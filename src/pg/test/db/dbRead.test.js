import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import pg from '../../index.js';
import expectSql from '../expectSql';

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
    // client.query.mockReset();
  });

  test('id_lookup', async () => {
    const now = Date.now();
    client.query.mockReturnValueOnce({
      rows: [[{ $key: 'foo', id: 'foo', name: 'Alice', version: now }]],
    });

    const result = await store.read('user.foo', {
      name: true,
      version: true,
    });

    expect(client.query).toBeCalled();
    expectSql(
      client.query.mock.calls[0][0],
      sql`SELECT to_jsonb ("user") || jsonb_build_object ( '$key' , "id" , '$ver' , cast ( extract ( epoch from now ( ) ) as integer ) )
       FROM "user" WHERE "id" IN ( ${'foo'} )
    `,
    );

    expect(result).toEqual({
      name: 'Alice',
      version: now,
    });
  });
});
