import sql, { raw, join } from 'sql-template-tag';
import { isPlainObject } from '@graffy/common';
import getArgSql from './getArgSql.js';
import getIdMeta from './getIdMeta.js';
import getSelectCols from './getSelectCols.js';

export function patch(object, arg, options) {
  const { table, idCol } = options;
  const { where, meta } = isPlainObject(arg)
    ? getArgSql(arg, options)
    : { where: [sql`"${raw(idCol)}" = ${arg}`], meta: getIdMeta(options) };
  if (!where || !where.length) throw Error('pg_write.no_condition');

  const row = object; // objectToRow(object, options);

  return sql`
    UPDATE "${raw(table)}" SET ${getUpdates(row, options)}
    WHERE ${join(where, ` AND `)}
    RETURNING (${getSelectCols(options)} || ${meta})`;
}

export function put(object, arg, options) {
  const { idCol, table } = options;
  const row = object; // objectToRow(object, options);

  let meta, conflictTarget;
  if (isPlainObject(arg)) {
    ({ meta } = getArgSql(arg));
    conflictTarget = join(Object.keys(arg).map((col) => sql`"${raw(col)}"`));
  } else {
    meta = getIdMeta(options);
    conflictTarget = sql`"${raw(idCol)}"`;
  }

  const { cols, vals } = getInsert(row, options);

  return sql`
    INSERT INTO "${raw(table)}" (${cols}) VALUES (${vals})
    ON CONFLICT (${conflictTarget}) DO UPDATE SET (${cols}) = (${vals})
    RETURNING (${getSelectCols(options)} || ${meta})`;
}

function getInsert(row, options) {
  const cols = [];
  const vals = [];

  Object.entries(row)
    .filter(([name]) => name !== options.verCol && name[0] !== '$')
    .concat([[options.verCol, sql`now()`]])
    .forEach(([col, val]) => {
      cols.push(sql`"${raw(col)}"`);
      vals.push(val);
    });

  return { cols: join(cols, ', '), vals: join(vals, ', ') };
}

function getUpdates(row, options) {
  return join(
    Object.entries(row)
      .filter(([name]) => name !== options.idCol && name[0] !== '$')
      .map(([name, value]) => {
        return sql`"${raw(name)}" = ${
          typeof value === 'object' && value
            ? sql`"${raw(name)}" || ${value}`
            : value
        }`;
      })
      .concat(sql`"${raw(options.verCol)}" = now()`),
    ', ',
  );
}
