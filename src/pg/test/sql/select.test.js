import { selectByArgs } from '../../sql/select.js';
import { createOptions } from '../../options.js';

import sql from 'sql-template-tag';
import expectSql from '../../sql/expectSql.js';
jest.mock('../../pool', () => {
  const mockPool = {
    __esModule: true,
    default: {
      loadSchema: (_) => undefined,
    },
  };

  return mockPool;
});
test('example', async () => {
  expectSql(
    await selectByArgs(
      { $first: 10 },
      createOptions(['user'], {
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
        '$ref', array[${'user'}, "id"], '$ver', cast ( extract ( epoch from now ( ) ) as integer ) 
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `,
  );
});
