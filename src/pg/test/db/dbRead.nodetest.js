import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, mock, test } from 'node:test';
import Graffy from '@graffy/core';
import sql from 'sql-template-tag';
import expectSql from '../expectSql.nodetest.js';

const defaultMockResult = { rowCount: 0, rows: [] };
const mockQuery = mock.fn(() => Promise.resolve(defaultMockResult));

await mock.module('pg', {
  exports: {
    escapeLiteral: (s) => `'${s.replace("'", "''")}'`,
    default: {
      Pool: class {
        query = mockQuery;
      },
      Client: class {
        query = mockQuery;
      },
    },
  },
});

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
    mockQuery.mock.resetCalls();
    mockQuery.mock.mockImplementation(() => Promise.resolve(defaultMockResult));
  });

  test('id_lookup', async () => {
    const now = Date.now();
    mockQuery.mock.mockImplementationOnce(() =>
      Promise.resolve({
        rows: [
          [
            {
              $key: 'foo',
              id: 'foo',
              name: 'Alice',
              quantities: [0, 1, 2],
              version: now,
            },
          ],
        ],
      }),
    );

    const result = await store.read('user.foo', {
      name: true,
      quantities: true,
      version: true,
    });

    assert.ok(mockQuery.mock.callCount() > 0);
    expectSql(
      mockQuery.mock.calls[0].arguments[0],
      sql`SELECT *, "id" AS "$key", current_timestamp AS "$ver"
        FROM "user" WHERE "id" IN ( ${'foo'} )`,
    );

    assert.deepStrictEqual(result, {
      name: 'Alice',
      quantities: [0, 1, 2],
      version: now,
    });
  });
});
