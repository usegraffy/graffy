import { put, patch } from '../../sql/upsert.js';

import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';
import { nowTimestamp } from '../../sql/clauses';

const options = {
  table: 'post',
  prefix: ['post'],
  idCol: 'id',
  verCol: 'version',
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
        },
        'post22',
        options,
      ),
      sql`INSERT INTO "post" ("id", "type", "name", "email", "config", "version")
      VALUES (${'post22'}, ${'post'}, ${'hello'},${'world'}, ${{ foo: 3 }},
      ${nowTimestamp})
      ON CONFLICT ("id") DO UPDATE SET ("id", "type", "name", "email", "config", "version")
        = (${'post22'}, ${'post'}, ${'hello'},${'world'}, ${{ foo: 3 }},
        ${nowTimestamp})
      RETURNING (to_jsonb("post") ||
        jsonb_build_object('$key', "id", '$ver',  ${nowTimestamp}))
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
        },
        'post22',
        options,
      ),
      sql`UPDATE "post" SET
        "type" = ${'post'},
        "name" = ${'hello'},
        "email" = ${'world'},
        "config" = "config" || ${{ foo: 3 }},
        "version" =  ${nowTimestamp}
      WHERE "id" = ${'post22'}
      RETURNING (to_jsonb("post") ||
        jsonb_build_object('$key', "id", '$ver', ${nowTimestamp}))
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
      VALUES (${'post22'}, ${'post'}, ${'hello'},${'world'}, ${nowTimestamp})
      ON CONFLICT ("email") DO UPDATE SET ("id", "type", "name", "email", "version")
        = (${'post22'}, ${'post'}, ${'hello'},${'world'},  ${nowTimestamp})
      RETURNING (to_jsonb("post") ||
        jsonb_build_object(
          '$key', ${'{"email":"world"}'}::jsonb,
          '$ref', jsonb_build_array(${'post'}::text, "id"),
          '$ver',  ${nowTimestamp}))`,
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
        "version" =  ${nowTimestamp}
      WHERE "id" = (SELECT "id" FROM "post" WHERE "email" = ${'world'} LIMIT 1)
      RETURNING (to_jsonb("post") ||
        jsonb_build_object(
          '$key', ${'{"email":"world"}'}::jsonb,
          '$ref', jsonb_build_array(${'post'}::text, "id"),
          '$ver',  ${nowTimestamp}))`,
    );
  });
});
