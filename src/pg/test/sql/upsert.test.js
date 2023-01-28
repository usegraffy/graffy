import { put, patch } from '../../sql/upsert.js';

import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';

const options = {
  table: 'post',
  prefix: ['post'],
  idCol: 'id',
  verCol: 'version',
  schema: {
    types: {
      id: 'text',
      name: 'text',
      type: 'text',
      email: 'text',
      config: 'jsonb',
      tags: 'jsonb',
      version: 'int8',
    },
  },
  verDefault: 'current_timestamp',
};

describe('byId', () => {
  test('put', async () => {
    expectSql(
      put(
        {
          $put: true,
          id: 'post22',
          type: 'post',
          name: 'hello',
          email: 'world',
          config: { foo: 3 },
          tags: [1, 2],
        },
        'post22',
        options,
      ),
      sql`INSERT INTO "post" ("id", "type", "name", "email", "config", "tags", "version")
      VALUES (${'post22'}, ${'post'}, ${'hello'},${'world'},
      ${JSON.stringify({ foo: 3 })}, ${JSON.stringify([1, 2])}, default)
      ON CONFLICT ("id") DO UPDATE SET ("id", "type", "name", "email", "config", "tags", "version")
        = (${'post22'}, ${'post'}, ${'hello'},${'world'},
        ${JSON.stringify({ foo: 3 })},
        ${JSON.stringify([1, 2])}, default)
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"
    `,
    );
  });

  test('patch', async () => {
    expectSql(
      patch(
        {
          id: 'post22',
          type: 'post',
          name: 'hello',
          email: 'world',
          config: { foo: 3 },
          tags: [1, 2, 3],
        },
        'post22',
        options,
      ),
      sql`UPDATE "post" SET
        "type" = ${'post'},
        "name" = ${'hello'},
        "email" = ${'world'},
        "config" = nullif(jsonb_strip_nulls((case jsonb_typeof("config") when 'object' then "config" else '{}'::jsonb end) ||
          jsonb_build_object ( ${'foo'}::text , ${'3'}::jsonb)), '{}'::jsonb),
        "tags" = ${JSON.stringify([1, 2, 3])}::jsonb,
        "version" =  default
      WHERE "id" = ${'post22'}
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"
    `,
    );
  });
});

describe('byArg', () => {
  test('put', async () => {
    expectSql(
      put(
        {
          $put: true,
          id: 'post22',
          type: 'post',
          name: 'hello',
          email: 'world',
        },
        { email: 'world' },
        options,
      ),
      sql`INSERT INTO "post" ("id", "type", "name", "email", "version")
      VALUES (${'post22'}, ${'post'}, ${'hello'},${'world'}, default)
      ON CONFLICT ("email") DO UPDATE SET ("id", "type", "name", "email", "version")
        = (${'post22'}, ${'post'}, ${'hello'},${'world'},  default)
      RETURNING *,
        ${'{"email":"world"}'}::jsonb AS "$key",
        current_timestamp AS "$ver",
        array[ ${'post'}::text, "id" ]::text[] AS "$ref"`,
    );
  });

  test('patch', async () => {
    expectSql(
      patch(
        {
          id: 'post22',
          type: 'post',
          name: 'hello',
          email: 'world',
        },
        { email: 'world' },
        options,
      ),
      sql`UPDATE "post" SET
        "type" = ${'post'},
        "name" = ${'hello'},
        "email" = ${'world'},
        "version" =  default
      WHERE "id" = (SELECT "id" FROM "post" WHERE "email" = ${'world'} LIMIT 2)
      RETURNING *,
        ${'{"email":"world"}'}::jsonb AS "$key",
        current_timestamp AS "$ver",
        array[ ${'post'}::text, "id" ]::text[] AS "$ref"`,
    );
  });
});
