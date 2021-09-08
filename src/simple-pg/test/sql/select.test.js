import { selectByIds } from '../../sql/select.js';

import sql from 'sql-template-tag';
import expectSql from '../expectSql.js';

test('should return select by ids query correctly', () => {
  const ids = ['foo'];
  const sqlString = sql`
      SELECT row_to_json ( a ) FROM (
        SELECT *
          FROM "user" WHERE "userId" IN (${ids[0]})
        ) a
    `;
  expectSql(selectByIds(ids, { id: 'userId', table: 'user' }), sqlString);
});
