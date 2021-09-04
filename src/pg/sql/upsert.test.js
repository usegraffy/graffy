import { put, patch } from './upsert.js';

import sql from 'sql-template-tag';
import expectSql from './expectSql.js';

const options = {
  table: 'post',
  prefix: ['post'],
  idCol: 'id',
  verCol: 'version',
};

test('put', async () => {
  expectSql(
    put(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      'post22',
      options,
    ),
    sql`INSERT INTO "post" ("id", "type", "name", "email", "version")
      VALUES (${'post22'}, ${'post'}, ${'hello'},${'world'}, now())
      ON CONFLICT ("id") DO UPDATE SET ("id", "type", "name", "email", "version")
        = (${'post22'}, ${'post'}, ${'hello'},${'world'}, now())
      RETURNING (to_json("post") ||
        jsonb_build_object('$key', "id", '$ver', now()))
    `,
  );
});

test('patch', async () => {
  expectSql(
    patch(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      'post22',
      options,
    ),
    sql`UPDATE "post" SET
        "type" = ${'post'},
        "name" = ${'hello'},
        "email" = ${'world'},
        "version" = now()
      WHERE "id" = ${'post22'}
      RETURNING (to_json("post") ||
        jsonb_build_object('$key', "id", '$ver', now()))
    `,
  );
});
