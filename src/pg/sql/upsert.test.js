import { put, patch } from './upsert.js';
import makeOptions from '../options.js';

import sql from 'sql-template-tag';
import expectSql from './expectSql.js';

const options = makeOptions(['post$'], {
  table: 'post',
  columns: {
    id: { role: 'primary' },
    type: { role: 'simple' },
    data: { role: 'default' },
    gin: { role: 'gin', props: ['email'] },
    version: { role: 'version' },
  },
});

test('put', async () => {
  expectSql(
    put(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      options,
    ),
    sql`INSERT INTO "post" ("id", "type", "gin", "data", "version")
      VALUES (${'post22'}, ${'post'},
        ${{ email: 'world' }},
        ${{ name: 'hello', email: 'world' }},
        ${expect.any(Number)})
      ON CONFLICT ("id") DO UPDATE SET ("id", "type", "gin", "data", "version")
        = (${'post22'}, ${'post'},
          ${{ email: 'world' }},
          ${{ name: 'hello', email: 'world' }},
          ${expect.any(Number)})
      RETURNING ("data" || jsonb_build_object('id', "id", 'type', "type"))
    `,
  );
});

test('patch', async () => {
  expectSql(
    patch(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      { id: 'post22' },
      options,
    ),
    sql`UPDATE "post" SET ("id", "type", "gin", "data", "version")
        = (${'post22'}, ${'post'},
          ${{ email: 'world' }},
          ${{ name: 'hello', email: 'world' }},
          ${expect.any(Number)})
      WHERE "id" = ${'post22'}
      RETURNING ("data" || jsonb_build_object('id', "id", 'type', "type"))
    `,
  );
});
