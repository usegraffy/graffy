import sql, { join, raw, empty } from 'sql-template-tag';
import getArgSql from './getArgSql.js';
import { getIdMeta } from './getMeta.js';
import { getSelectCols } from './helper.js';

const MAX_LIMIT = 4096;

export function selectByArgs(args, options) {
  const { table } = options;
  const { where, order, limit, meta } = getArgSql(args, options);
  const clampedLimit = limit || MAX_LIMIT;
  return sql`
    SELECT
    ${getSelectCols(table)} || ${meta}
    FROM "${raw(table)}"
    ${where.length ? sql`WHERE ${join(where, ` AND `)}` : empty}
    ${order ? sql`ORDER BY ${order}` : empty}
    LIMIT ${clampedLimit}
  `;
}

export function selectByIds(ids, options) {
  const { table, idCol } = options;
  return sql`
    SELECT
    ${getSelectCols(table)} || ${getIdMeta(options)}
    FROM "${raw(table)}"
    WHERE "${raw(idCol)}" IN (${join(ids)})
  `;
}
