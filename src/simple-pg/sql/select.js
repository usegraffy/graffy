import sql, { join, raw, empty } from 'sql-template-tag';
// import debug from 'debug';
// const log = debug('graffy:pg:select');

const MAX_LIMIT = 4096;

export function selectByArgs(args, options, limit = MAX_LIMIT) {
  const { table } = options;
  const where = options;

  return sql`
    SELECT *
    FROM "${raw(table)}"
    ${where.length ? sql`WHERE ${join(where, ` AND `)}` : empty}
    LIMIT ${limit}
  `;
}

export function selectByIds(ids, options) {
  const { table, id } = options;
  return sql`
    SELECT * 
    FROM "${raw(table)}"
    WHERE "${raw(id)}" IN (${join(ids)})
  `;
}

export function selectUpdatedSince(options, time) {
  const { table, version } = options;
  return sql`
    SELECT * 
    FROM "${raw(table)}"
    WHERE "${raw(version)}" > ${time}
    LIMIT ${MAX_LIMIT}
  `;
}
