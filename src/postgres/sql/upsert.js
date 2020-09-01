import sql from 'sqlate';
import pool from './pool.js';
import { getInsertCols, getInsertVals, getUpdateSet } from './util.js';

/*
  We are not doing insert-on-conflict-do-update here, but instead doing an
  update first, then doing an insert if no rows were affected.

  The reason is that we need to support partial change objects, which isn't
  insertable; so the insert attempt will fail prematurely (due to non null
  constraint violations) and it will never reach the update which would have
  worked.

  Our approach is not concurrency-safe. If two writes a non-existent ID occur
  simultaneously, one might fail instead of one becoming an insert and the
  other an update. We are accepting this limitation.
*/

export async function upsertToId(object, options) {
  const { table } = options;

  if (!object.id) {
    throw Error('postgres.write_no_id: ' + JSON.stringify(object));
  }

  const updateQuery = sql`
    UPDATE ${sql.table(table)} SET ${getUpdateSet(object, options)}
    WHERE "id" = ${object.id}`;

  const { rowCount } = await pool.query(updateQuery);
  if (rowCount) return;

  const query = sql`
    INSERT INTO ${sql.table(table)} (${getInsertCols(options)})
    VALUES ${getInsertVals(object, options)}`;

  await pool.query(query);
}
