import { empty, makePath } from '@graffy/common';
import sql from 'sqlate';

export const concatSql = (frags, delim) =>
  frags.length
    ? frags.reduce((pre, frag) => (pre ? sql`${pre}${delim}${frag}` : frag))
    : sql``;

const getLookupSql = (name) =>
  ['id', 'type', 'name', 'createTime', 'updateTime', 'isDeleted'].includes(name)
    ? sql.column(name)
    : sql`"tags" #>> ${'{' + makePath(name).join(',') + '}'}`;

/*
  Converts a small subset of Mongo-style params to an SQL where clause.
*/
function getFilterCond(params) {
  return Object.keys(params).map((name) => {
    const value = params[name];
    const lhs = getLookupSql(name);
    if (typeof value !== 'object') return sql`${lhs} = ${value}`;
    if (value === null) return sql`${lhs} IS NULL`;

    return concatSql(
      Object.keys(value).map((operator) => {
        const rhs = value[operator];
        switch (operator) {
          case '$eq':
            return sql`${lhs} = ${rhs}`;
          case '$ne':
            return sql`${lhs} <> ${rhs}`;
          case '$lt':
            return sql`${lhs} < ${rhs}`;
          case '$lte':
            return sql`${lhs} <= ${rhs}`;
          case '$gt':
            return sql`${lhs} > ${rhs}`;
          case '$gte':
            return sql`${lhs} >= ${rhs}`;
          case '$in':
            return sql`${lhs} IN ${rhs}`;
          case '$nin':
            return sql`${lhs} NOT IN ${rhs}`;
          case '$cts':
            return sql`${lhs} @> ${rhs}`;
          case '$ctd':
            return sql`${lhs} <@ ${rhs}`;
          case '$ovp':
            return sql`${lhs} && ${rhs}`;
        }
      }),
      sql` AND `,
    );
  });
}

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

export function getArgSql({
  first,
  last,
  after,
  before,
  since,
  until,
  order,
  cursor: _,
  id,
  ...filter
}) {
  const orderCols = (order || ['createTime', 'id']).map(getLookupSql);
  const where = [];

  if (!empty(filter)) where.push(...getFilterCond(filter));
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

function jsonUpdate(column, object) {
  return sql`${column} || ${JSON.stringify(object)}::jsonb`;
}

// TODO: Update these functions to use columns from options

export function getSelectCols(_options) {
  return sql`data || jsonb_build_object(
    'id', jsonb_build_object( '_val_', "id"),
    'type', "type",
    'createTime', "createTime",
    'updateTime', "updateTime"
  )`;
}

export function getInsertCols(_options) {
  return sql`"id", "type", "createTime", "updateTime", "data"`;
}

export function getUpdateSet(object, _options) {
  const { id, type, name, createTime, updateTime, ...data } = object;

  return sql.csv(
    [
      type && sql`"type" = ${type}`,
      name && sql`"name" = ${name}`,
      sql`"updateTime" = ${Date.now()}`,
      !empty(data) && sql`"data" = ${jsonUpdate(sql.column('data'), data)}`,
    ].filter(Boolean),
  );
}

export function getInsertVals(object, _options) {
  const { id, type, name, createTime, updateTime, ...data } = object;
  return sql.tuple([id, type, name, Date.now(), Date.now(), data]);
}
