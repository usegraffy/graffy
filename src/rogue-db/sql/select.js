import sql from 'sqlate';
import pool from './pool.js';
import { getArgSql, concatSql, getSelectCols } from './util.js';
import debug from 'debug';

const log = debug('graffy:rogue-db:select');

export async function selectByArgs(args, options) {
  const { prefix, collection } = options;
  const { where, order, limit, key } = getArgSql(args);

  where.push(sql`"type" = ${collection}`);

  const query = sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object(
      '_key_', ${key},
      '_ref_', array[${sql.csv(prefix)}, "id"[1]]
    )
    FROM "object"
    ${where.length ? sql`WHERE ${concatSql(where, sql` AND `)}` : sql``}
    ORDER BY ${order} LIMIT ${limit}`;

  log(query.toString('$'));
  log(query.parameters);

  query.rowMode = 'array';
  const result = (await pool.query(query)).rows.flat(1);
  log(result);
  return result;
}

export async function selectByIds(ids, options) {
  const query = sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object('_key_', "id"[1])
    FROM "object"
    WHERE id && ${ids}`;

  log(query.toString('$'));
  log(query.parameters);

  query.rowMode = 'array';
  const result = (await pool.query(query)).rows.flat(1);
  log(result);
  return result;
}
