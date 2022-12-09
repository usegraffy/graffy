import sql, { join, raw, empty } from 'sql-template-tag';
import getArgSql from './getArgSql.js';
import { getIdMeta } from './getMeta.js';
import { getSelectCols } from './clauses.js';

const MAX_LIMIT = 4096;

export function selectByArgs(args, projection, options) {
  const { table } = options;
  const { where, order, group, limit, meta } = getArgSql(args, options);
  const clampedLimit = Math.min(MAX_LIMIT, limit || MAX_LIMIT);
  return sql`
    SELECT
    ${getSelectCols(table, projection)}, ${meta}
    FROM "${raw(table)}"
    ${where.length ? sql`WHERE ${join(where, ' AND ')}` : empty}
    ${group ? sql`GROUP BY ${group}` : empty}
    ${order ? sql`ORDER BY ${order}` : empty}
    LIMIT ${clampedLimit}
  `;
}

export function selectByIds(ids, projection, options) {
  const { table, idCol } = options;
  return sql`
    SELECT
    ${getSelectCols(table, projection)}, ${getIdMeta(options)}
    FROM "${raw(table)}"
    WHERE "${raw(idCol)}" IN (${join(ids)})
  `;
}
