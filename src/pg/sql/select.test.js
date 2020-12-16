import { selectByArgs } from './select.js';
import makeOptions from '../options.js';

import sql from 'sqlate';

function expectSql(actual, expected) {
  const normalSql = (str) => str.toString('$').trim().replace(/\s+/g, ' ');
  expect(normalSql(actual)).toEqual(normalSql(expected));
  expect(actual.parameters).toEqual(expected.parameters);
}

test('example', async () => {
  expectSql(
    await selectByArgs({ first: 10 }, makeOptions(['user'], {})),
    sql`
      SELECT "data" || jsonb_build_object(
        '_key_', jsonb_build_array("id"),
        '_ref_', array[${'user'}, "id"]
      )
      FROM "user" ORDER BY "id" ASC LIMIT ${10}
    `,
  );
});
