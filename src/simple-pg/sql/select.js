import sql, { join, raw, empty } from 'sql-template-tag';
import { whereConditions } from './helper';
// import debug from 'debug';
// const log = debug('graffy:pg:select');

const MAX_LIMIT = 4096;

export function selectByArgs(args, options, limit = MAX_LIMIT) {
  const { table } = options;
  const conditions = whereConditions(options);

  return sql`
   SELECT row_to_json(a) FROM (
      SELECT *
      FROM "${raw(table)}"
      ${options.length ? sql`WHERE ${conditions}` : empty}
      LIMIT ${limit}
    ) a
  `;
}

export function selectByIds(ids, options) {
  const { table, id } = options;
  return sql`
    SELECT row_to_json(a) FROM (
      SELECT *
      FROM "${raw(table)}"
      WHERE "${raw(id)}" IN (${join(ids)})
    ) a
  `;
}
