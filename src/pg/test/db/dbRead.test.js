import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import { pg } from '../../index.js';
import expectSql from '../expectSql';

let mockQuery = jest.fn();

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
    store.use(
      'user',
      pg({ idCol: 'id', verCol: 'version', schema: { types: {} } }),
    );
  });

  afterEach(async () => {
    mockQuery.mockReset();
  });

  test('id_lookup', async () => {
    const now = Date.now();
    mockQuery.mockReturnValueOnce({
      rows: [[{ $key: 'foo', id: 'foo', name: 'Alice', version: now }]],
    });

    const result = await store.read('user.foo', {
      name: true,
      version: true,
    });

    expect(mockQuery).toBeCalled();
    expectSql(
      mockQuery.mock.calls[0][0],
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
