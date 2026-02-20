import { literal, quoteIdent } from './escape.js';
import getArgSql from './getArgSql.js';

function getTableSql({ database = 'default', table, final = true }) {
  const tableSql = `${quoteIdent(database)}.${quoteIdent(table)}`;
  return final ? `${tableSql} FINAL` : tableSql;
}

export function selectByArgs(args, options) {
  const { where, order, limit, ...rest } = getArgSql(args, options);
  const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const orderClause = order ? ` ORDER BY ${order}` : '';

  return {
    ...rest,
    where,
    order,
    limit,
    sql: `SELECT * FROM ${getTableSql(options)}${whereClause}${orderClause} LIMIT ${limit}`,
  };
}

export function selectByIds(ids, options) {
  const where = [];
  if (options.final !== false && options.schema?.types?._sign) {
    where.push('`_sign` = 1');
  }
  where.push(
    `${quoteIdent(options.idCol)} IN (${ids.map((id) => literal(id)).join(', ')})`,
  );
  return {
    sql: `SELECT * FROM ${getTableSql(options)} WHERE ${where.join(' AND ')}`,
  };
}
