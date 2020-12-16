import sql from 'sqlate';
import { getArgSql, concatSql } from './util.js';
import { empty } from '@graffy/common';

const MAX_LIMIT = 4096;

export function selectByArgs(args, options, { forUpdate } = {}) {
  const { prefix, table } = options;
  const { where, order, limit, key } = getArgSql(args, options);
  const clampedLimit = forUpdate
    ? 1
    : Math.min(MAX_LIMIT, Math.max(0, limit || 0));

  return sql`
    SELECT
    ${forUpdate ? sql`FOR UPDATE` : sql``}
    ${getSelectCols(options)} || jsonb_build_object(
      '_key_', ${key},
      '_ref_', array[${sql.csv(prefix)}, ${sql.column(options.idCol)}]
    )
    FROM ${sql.table(table)}
    ${where.length ? sql`WHERE ${concatSql(where, sql` AND `)}` : sql``}
    ORDER BY ${order} LIMIT ${clampedLimit}`;
}

export function selectByIds(ids, options, { forUpdate } = {}) {
  const { table, idCol } = options;
  return sql`
    SELECT
    ${forUpdate ? sql`FOR UPDATE` : sql``}
    ${getSelectCols(options)} || jsonb_build_object(
      '_key_', ${sql.column(options.idCol)}
    )
    FROM ${sql.table(table)}
    WHERE ${sql.column(idCol)} IN ${sql.in(ids)}`;
}

export function selectUpdatedSince(version, options) {
  const { table, verCol } = options;
  return sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object(
      '_key_', ${sql.column(options.idCol)}
    )
    FROM ${sql.table(table)}
    WHERE ${sql.column(verCol)} > ${version}
    LIMIT ${MAX_LIMIT}
  `;
}

export function getSelectCols(options) {
  return concatSql(
    [
      options.defCol && sql.column(options.defCol),
      !empty(options.columns) &&
        sql`jsonb_build_object(${sql.csv(
          Object.entries(options.columns).map(
            ([column, { prop }]) => sql`${prop}, ${sql.column(column)}`,
          ),
        )})`,
    ].filter(Boolean),
    sql`||`,
  );
}
