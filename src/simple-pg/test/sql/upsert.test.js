import { put, patch } from '../../sql';

import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';
import { _nowToInt } from '../../sql/helper';

describe('test upset', () => {
  const options = { id: 'id', table: 'post', version: 'version' };
  const data = {
    id: 'post22',
    type: 'post',
    name: 'hello',
    email: 'world',
  };
  test('should return correct upsert fof put sql with right params and values', async () => {
    const sqlQuery = put(data, options);
    const version = sqlQuery.values[sqlQuery.values.length - 1];
    expectSql(
      sqlQuery,
      sql`INSERT INTO "post" ("id", "type", "name", "email", "version")
      VALUES (${data.id}, ${data.type}, ${data.name}, ${data.email}, ${version} )
      ON CONFLICT ("id") DO UPDATE SET
      ("id", "type", "name", "email", "version") = (${data.id}, ${data.type},${data.name}, ${data.email}, ${version})
      RETURNING *
    `,
    );
  });

  test('should return correct upsert fof patch sql with right params and values', async () => {
    const sqlQuery = patch(data, data.id, options);
    expectSql(
      sqlQuery,
      sql`UPDATE "post" SET
        "type" = ${data.type},
        "name" = ${data.name},
        "email" = ${data.email},
        "version" = ${_nowToInt}
      WHERE "id" = ${data.id}
      RETURNING *
    `,
    );
  });
});
