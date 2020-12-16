import { empty, makePath } from '@graffy/common';
import { getSql } from '../filter';
import sql from 'sqlate';

import debug from 'debug';
const log = debug('graffy:stdDb:util');

export async function readSql(sql, client) {
  log(sql.toString('$'));
  log(sql.parameters);

  sql.rowMode = 'array';
  const result = (await client.query(sql)).rows;
  log(result);
  return result;
}

export const concatSql = (frags, delim) =>
  frags.length
    ? frags.reduce((pre, frag) => (pre ? sql`${pre}${delim}${frag}` : frag))
    : sql``;

const getLookupSql = (name) =>
  ['id', 'type', 'createTime', 'updateTime', 'isDeleted'].includes(name)
    ? sql.column(name)
    : sql`"tags" #>> ${'{' + makePath(name).join(',') + '}'}`;

function getBoundCond(orderCols, bound, kind) {
  if (!Array.isArray(bound)) {
    throw Error('bad_query bound:' + JSON.stringify(bound));
  }

  const lhs = orderCols[0];
  const rhs = bound[0];
  if (orderCols.length > 1 && bound.length > 1) {
    const subCond = getBoundCond(orderCols.slice(1), bound.slice(1), kind);
    switch (kind) {
      case 'after':
      case 'since':
        return sql`${lhs} > ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
      case 'before':
      case 'until':
        return sql`${lhs} < ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
    }
  } else {
    switch (kind) {
      case 'after':
        return sql`${lhs} > ${rhs}`;
      case 'since':
        return sql`${lhs} >= ${rhs}`;
      case 'before':
        return sql`${lhs} < ${rhs}`;
      case 'until':
        return sql`${lhs} <= ${rhs}`;
    }
  }
}

export function getArgSql(
  { first, last, after, before, since, until, order, cursor: _, id, ...filter },
  options,
) {
  const orderCols = (order || [options.idCol]).map(getLookupSql);
  const where = [];

  if (!empty(filter)) where.push(...getSql(filter, getLookupSql));
  if (after) where.push(getBoundCond(orderCols, after, 'after'));
  if (before) where.push(getBoundCond(orderCols, before, 'before'));
  if (since) where.push(getBoundCond(orderCols, since, 'since'));
  if (until) where.push(getBoundCond(orderCols, until, 'until'));

  const cursor = sql`jsonb_build_array(${sql.csv(orderCols)})`;
  const key = empty(filter)
    ? cursor
    : sql`${JSON.stringify(
        filter,
      )}::jsonb || jsonb_build_object('cursor', ${cursor})`;

  return {
    key,
    where,
    order: sql.csv(
      orderCols.map((col) => sql`${col} ${last ? sql`DESC` : sql`ASC`}`),
    ),
    limit: first || last,
  };
}
