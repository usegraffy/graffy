import { selectByArgs } from './select.js';
import makeOptions from '../options.js';

import sql from 'sql-template-tag';
import expectSql from './expectSql.js';

test('example', async () => {
  expectSql(
    await selectByArgs(
      { $first: 10 },
      makeOptions(['user'], {
        columns: {
          id: { role: 'primary' },
          data: { role: 'default' },
          version: { role: 'version' },
          type: { role: 'simple', prop: 'userType' },
          tags: { role: 'gin', props: ['email', 'phone'] },
          trgm: { role: 'trgm', props: ['name'] },
        },
      }),
    ),
    sql`
      SELECT "data" || jsonb_build_object(
        'id', "id", 'userType', "type"
      ) || jsonb_build_object(
        '$key', (jsonb_build_object ('$cursor', jsonb_build_array("id"))),
        '$ref', array[${'user'}, "id"]
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `,
  );
});
