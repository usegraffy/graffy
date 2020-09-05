import sql from 'sqlate';
import pool from './pool.js';
import { getArgSql, concatSql, getSelectCols } from './util.js';

export async function selectByArgs(args, options) {
  const { prefix, table } = options;
  const { where, order, limit, key } = getArgSql(args);

  const query = sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object(
      '_key_', ${key},
      '_ref_', array[${sql.csv(prefix)}, "id"]
    )
    FROM ${sql.table(table)}
    ${where.length ? sql`WHERE ${concatSql(where, sql` AND `)}` : sql``}
    ORDER BY ${order} LIMIT ${limit}`;

  query.rowMode = 'array';
  return (await pool.query(query)).rows.flat(1);
}

export async function selectByIds(ids, options) {
  const { table } = options;
  const query = sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object(id _key_)
    FROM ${sql.table(table)}
    WHERE id IN ${sql.in(ids)}`;

  query.rowMode = 'array';
  return (await pool.query(query)).rows.flat(1);
}
