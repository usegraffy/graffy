import { put, patch } from './../sql/upsert.test';
import { createOptions } from '../../options.js';

import sql from 'sql-template-tag';
import expectSql from '../sql/select.test';
jest.mock('../../pool', () => {
  const mockPool = {
    __esModule: true,
    default: {
      loadSchema: (_) => undefined,
    },
  };

  return mockPool;
});
const options = createOptions(['post$'], {
  table: 'post',
  columns: {
    id: { role: 'primary' },
    type: { role: 'simple' },
    data: { role: 'default', updater: '||' },
    gin: { role: 'gin', props: ['email'] },
    version: { role: 'version' },
  },
});

test.skip('put', async () => {
  expectSql(
    put(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      'post22',
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
      RETURNING ("data" || jsonb_build_object('id', "id", 'type', "type") ||
        jsonb_build_object('$key', "id", '$ver', now()))
    `,
  );
});

test.skip('patch', async () => {
  expectSql(
    patch(
      { $put: true, id: 'post22', type: 'post', name: 'hello', email: 'world' },
      'post22',
      options,
    ),
    sql`UPDATE "post" SET
        "type" = ${'post'},
        "gin" = ${{ email: 'world' }},
        "data" = "data" || ${{ name: 'hello', email: 'world' }},
        "version" = now()
      WHERE "id" = ${'post22'}
      RETURNING ("data" || jsonb_build_object('id', "id", 'type', "type") ||
        jsonb_build_object('$key', "id", '$ver',  cast(extract(epoch from now()) as integer)))
    `,
  );
});
