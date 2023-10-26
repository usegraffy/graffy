import { isPlainObject } from '@graffy/common';
import sql, { join, raw } from 'sql-template-tag';
import { getInsert, getSelectCols, getUpdates } from './clauses.js';
import getArgSql from './getArgSql.js';
import { getIdMeta } from './getMeta.js';

function getSingleSql(arg, options) {
  const { table, idCol } = options;
  if (!isPlainObject(arg)) {
    return {
      where: sql`"${raw(idCol)}" = ${arg}`,
      meta: getIdMeta(options),
    };
  }

  const { where, meta } = getArgSql(arg, options);
  if (!where?.length) throw Error('pg_write.no_condition');

  // We use a subquery with limit 2 to ensure an error is thrown if the filter
  // matches multiple rows.
  return {
    where: sql`"${raw(idCol)}" = (
        SELECT "${raw(idCol)}"
        FROM "${raw(table)}"
        WHERE ${join(where, ' AND ')}
        LIMIT 2
      )`,
    meta,
  };
}

export function patch(object, arg, options) {
  const { table } = options;
  const { where, meta } = getSingleSql(arg, options);

  const row = object;

  return sql`
    UPDATE "${raw(table)}" SET ${getUpdates(row, options)}
    WHERE ${where}
    RETURNING ${getSelectCols(options)}, ${meta}`;
}

export function put(puts, options) {
  const { idCol, table } = options;
  const sqls = [];

  const addSql = (rows, meta, conflictTarget) => {
    const { cols, vals, updates } = getInsert(rows, options);
    sqls.push(sql`
      INSERT INTO "${raw(table)}" (${cols}) VALUES ${vals}
      ON CONFLICT (${conflictTarget}) DO UPDATE SET ${updates}
      RETURNING ${getSelectCols(options)}, ${meta}`);
  };

  const idRows = [];
  for (const put of puts) {
    const [row, arg] = put;
    if (!isPlainObject(arg)) {
      idRows.push(row);
      continue;
    }

    const { meta } = getArgSql(arg, options);
    const conflictTarget = join(
      Object.keys(arg).map((col) => sql`"${raw(col)}"`),
    );
    addSql([row], meta, conflictTarget);
  }

  if (idRows.length) {
    const meta = getIdMeta(options);
    const conflictTarget = sql`"${raw(idCol)}"`;
    addSql(idRows, meta, conflictTarget);
  }

  return sqls;
}

export function del(arg, options) {
  const { table } = options;
  const { where } = getSingleSql(arg, options);

  return sql`
    DELETE FROM "${raw(table)}"
    WHERE ${where}
    RETURNING ${arg} "$key"`;
}
