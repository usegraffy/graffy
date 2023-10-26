import { patch, put } from '../../sql/upsert.js';

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
      quantities: 'cube',
    },
  },
  verDefault: 'current_timestamp',
};

describe('byId', () => {
  test('put', async () => {
    const sqls = put(
      [
        [
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
        ],
      ],
      options,
    );
    expectSql(
      sqls[0],
      sql`INSERT INTO "post" ("id", "name", "type", "email", "config", "tags", "version")
      VALUES (${'post22'}, ${'hello'}, ${'post'}, ${'world'},
      ${JSON.stringify({ foo: 3 })}, ${JSON.stringify([1, 2])}, default)
      ON CONFLICT ("id") DO UPDATE SET "id" = "excluded"."id", "name" = "excluded"."name",
        "type" = "excluded"."type", "email" = "excluded"."email", "config" = "excluded"."config",
        "tags" = "excluded"."tags", "version" = "excluded"."version"
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
          quantities: [100000, 75000, 0],
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
        "quantities" = cube ( array[${100000} , ${75000} , ${0}]::float8[] ),
        "version" =  default
      WHERE "id" = ${'post22'}
      RETURNING *, "id" AS "$key", current_timestamp AS "$ver"
    `,
    );
  });
});

describe('byArg', () => {
  test('put', async () => {
    const sqls = put(
      [
        [
          {
            $put: true,
            id: 'post22',
            type: 'post',
            name: 'hello',
            email: 'world',
          },
          { email: 'world' },
        ],
      ],
      options,
    );
    expectSql(
      sqls[0],
      sql`INSERT INTO "post" ("id", "name", "type", "email", "version")
      VALUES (${'post22'}, ${'hello'}, ${'post'}, ${'world'}, default)
      ON CONFLICT ("email") DO UPDATE SET "id" = "excluded"."id", "name" = "excluded"."name",
      "type" = "excluded"."type", "email" = "excluded"."email", "version" = "excluded"."version"
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
