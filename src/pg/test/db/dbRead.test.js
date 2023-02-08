import { jest } from '@jest/globals';
import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import expectSql from '../expectSql';

let mockQuery = jest.fn();

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
        idCol: 'id',
        verCol: 'version',
        schema: { types: {} },
        verDefault: 'current_timestamp',
      }),
    );
  });

  afterEach(async () => {
    mockQuery.mockReset();
  });

  test('id_lookup', async () => {
    const now = Date.now();
    mockQuery.mockReturnValueOnce({
      rows: [[{ $key: 'foo', id: 'foo', name: 'Alice', quantities: [0, 1, 2], version: now }]],
    });

    const result = await store.read('user.foo', {
      name: true,
      quantities: true,
      version: true,
    });

    expect(mockQuery).toBeCalled();
    expectSql(
      mockQuery.mock.calls[0][0],
      sql`SELECT *, "id" AS "$key", current_timestamp AS "$ver"
        FROM "user" WHERE "id" IN ( ${'foo'} )`,
    );

    expect(result).toEqual({
      name: 'Alice',
      quantities: [0, 1, 2],
      version: now,
    });
  });
});
