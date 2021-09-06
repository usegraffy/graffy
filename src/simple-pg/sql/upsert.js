import sql, { raw } from 'sql-template-tag';
import { colsAndValues, getUpdates } from './helper';

export function patch(object, arg, options) {
  const { table, id } = options;
  const where = sql`"${raw(id)}" = ${arg}`;
  if (!where) throw Error('pg_write.no_condition');

  const setUpdate = getUpdates(object, options);
  return sql`
    UPDATE "${raw(table)}" SET ${setUpdate}
    WHERE ${where}
    RETURNING row_to_json(${raw(table)}.*)`;
}

export function put(object, arg, options) {
  delete object.$put;
  const { id, table, version = 'version' } = options;
  const insertObject = { [id]: arg, ...object }; // assume that arg is not an object in this simple version
  const { cols, values } = colsAndValues(insertObject, version);

  const { cols: colsForUpdate, values: valuesForUpdate } = colsAndValues(
    object,
    version,
  );

  const conflictTarget = sql`"${raw(id)}"`;
  return sql`
    INSERT INTO "${raw(table)}" (${cols})
    VALUES (${values})
    ON CONFLICT (${conflictTarget}) DO UPDATE SET
    (${colsForUpdate}) = (${valuesForUpdate})
    RETURNING row_to_json(${raw(table)}.*)`;
}
