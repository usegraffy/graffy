import sql, { join, raw, empty } from 'sql-template-tag';
import getArgSql from './getArgSql.js';
import getIdMeta from './getIdMeta.js';
import getSelectCols from './getSelectCols.js';
// import debug from 'debug';
// const log = debug('graffy:pg:select');

const MAX_LIMIT = 4096;

export function selectByArgs(args, options, { forUpdate = false } = {}) {
  const { table } = options;
  const { where, order, limit, meta } = getArgSql(args, options);
  const clampedLimit = forUpdate
    ? 1
    : Math.min(MAX_LIMIT, Math.max(0, limit || 0));

  return sql`
    SELECT
    ${getSelectCols(options)} || ${meta}
    FROM "${raw(table)}"
    ${where.length ? sql`WHERE ${join(where, ` AND `)}` : empty}
    ${order ? sql`ORDER BY ${order}` : empty}
    LIMIT ${clampedLimit}
    ${forUpdate ? sql`FOR UPDATE` : empty}
  `;
}

export function selectByIds(ids, options, { forUpdate = false } = {}) {
  const { table, idCol } = options;
  return sql`
    SELECT
    ${getSelectCols(options)} || ${getIdMeta(options)}
    FROM "${raw(table)}"
    WHERE "${raw(idCol)}" IN (${join(ids)})
    ${forUpdate ? sql`FOR UPDATE` : empty}
  `;
}

export function selectUpdatedSince(version, options) {
  const { table, verCol } = options;
  return sql`
    SELECT ${getSelectCols(options)} || ${getIdMeta(options)}
    FROM "${raw(table)}"
    WHERE "${raw(verCol)}" > ${version}
    LIMIT ${MAX_LIMIT}
  `;
}
