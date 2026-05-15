import { literal, quoteIdent } from './escape.ts';
import getArgSql from './getArgSql.ts';
import { getLookup } from './lookup.ts';

const aggOps = {
  $sum: (lookup) => `sum(${lookup.numericExpr})`,
  $avg: (lookup) => `avg(${lookup.numericExpr})`,
  $max: (lookup) => `max(${lookup.numericExpr})`,
  $min: (lookup) => `min(${lookup.numericExpr})`,
  $card: (lookup) => `uniqExact(${lookup.rawExpr})`,
};

const aggOpOrder = ['$sum', '$avg', '$max', '$min', '$card'];

export function getTableSql({ database = 'default', table, final = false }) {
  const tableSql = `${quoteIdent(database)}.${quoteIdent(table)}`;
  return final ? `${tableSql} FINAL` : tableSql;
}

function getAggregateSelectSql(projection, options, groupSpec) {
  const selectCols = [];
  const groupExprs = [];
  const groupAliases = [];
  const aggregateAliases = {};
  let aggIx = 0;

  if (Array.isArray(groupSpec)) {
    groupSpec.forEach((prop, ix) => {
      const lookup = getLookup(prop, options);
      const alias = `__group_${ix}`;
      selectCols.push(`${lookup.orderExpr} AS ${quoteIdent(alias)}`);
      groupExprs.push(lookup.orderExpr);
      groupAliases.push(alias);
    });
  }

  if (projection?.$count) {
    selectCols.push(`count() AS ${quoteIdent('$count')}`);
  }

  aggOpOrder.forEach((op) => {
    const values = projection?.[op];
    if (!values || typeof values !== 'object') return;
    Object.keys(values).forEach((prop) => {
      const alias = `__agg_${aggIx++}`;
      const lookup = getLookup(prop, options);
      selectCols.push(`${aggOps[op](lookup)} AS ${quoteIdent(alias)}`);
      aggregateAliases[alias] = { op, prop };
    });
  });

  if (!selectCols.length) selectCols.push('count() AS `__count`');

  return {
    selectSql: selectCols.join(', '),
    aggregateAliases,
    groupAliases,
    groupExprs,
  };
}

export function selectByArgs(args, projection, options) {
  const { where, order, limit, groupSpec, ...rest } = getArgSql(args, options);
  const whereClause = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const orderClause = order ? ` ORDER BY ${order}` : '';

  const wantsAggregate =
    !!groupSpec ||
    !!projection?.$count ||
    aggOpOrder.some(
      (op) => projection?.[op] && typeof projection[op] === 'object',
    );

  if (!wantsAggregate) {
    return {
      ...rest,
      where,
      order,
      limit,
      groupSpec,
      isAggregate: false,
      aggregateAliases: {},
      groupAliases: [],
      sql: `SELECT * FROM ${getTableSql(options)}${whereClause}${orderClause} LIMIT ${limit}`,
    };
  }

  const { selectSql, aggregateAliases, groupAliases, groupExprs } =
    getAggregateSelectSql(projection, options, groupSpec);
  const groupClause = groupExprs.length
    ? ` GROUP BY ${groupExprs.join(', ')}`
    : '';

  return {
    ...rest,
    where,
    order,
    limit,
    groupSpec,
    isAggregate: true,
    aggregateAliases,
    groupAliases,
    sql: `SELECT ${selectSql} FROM ${getTableSql(options)}${whereClause}${groupClause}${orderClause} LIMIT ${limit}`,
  };
}

export function selectByIds(ids, options) {
  const where = [
    `${quoteIdent(options.idCol)} IN (${ids.map((id) => literal(id)).join(', ')})`,
  ];
  return {
    sql: `SELECT * FROM ${getTableSql(options)} WHERE ${where.join(' AND ')}`,
  };
}
