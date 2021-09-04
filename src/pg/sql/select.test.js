import { selectByArgs } from './select.js';

import sql from 'sql-template-tag';
import expectSql from './expectSql.js';

test('example', async () => {
  expectSql(
    await selectByArgs(
      { $first: 10 },
      { table: 'user', prefix: ['user'], idCol: 'id', verCol: 'version' },
    ),
    sql`
      SELECT to_json("user") || jsonb_build_object(
        '$key', (jsonb_build_object ('$cursor', jsonb_build_array("id"))),
        '$ref', array[${'user'}, "id"], '$ver', now()
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `,
  );
});
