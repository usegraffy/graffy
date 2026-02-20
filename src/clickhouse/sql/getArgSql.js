import { isEmpty } from '@graffy/common';
import getFilterSql from '../filter/getSql.js';
import { literal } from './escape.js';
import { getLookup } from './lookup.js';

const MAX_LIMIT = 4096;

function getBoundCond(boundCols, bound, kind) {
  if (
    !Array.isArray(bound) ||
    !bound.length ||
    boundCols.length !== bound.length
  ) {
    throw Error(`clickhouse_arg.bad_query bound:${JSON.stringify(bound)}`);
  }

  const lhs = `(${boundCols.join(', ')})`;
  const rhs = `(${bound.map((item) => literal(item)).join(', ')})`;

  switch (kind) {
    case '$after':
      return `${lhs} > ${rhs}`;
    case '$since':
      return `${lhs} >= ${rhs}`;
    case '$before':
      return `${lhs} < ${rhs}`;
    case '$until':
      return `${lhs} <= ${rhs}`;
    default:
      throw Error(`clickhouse_arg.bad_bound_kind ${kind}`);
  }
}

export default function getArgSql(
  { $first, $last, $after, $before, $since, $until, $all, $cursor: _, ...rest },
  options,
) {
  const { $order, $group, ...filter } = rest;

  if ($group) throw Error('clickhouse_arg.group_unsupported');

  const hasRangeArg = !!(
    $before ||
    $after ||
    $since ||
    $until ||
    $first ||
    $last ||
    $all
  );

  if ($order && !hasRangeArg) {
    throw Error('clickhouse_arg.range_arg_expected');
  }

  const where = [];
  if (options.final !== false && options.schema?.types?._sign) {
    where.push('`_sign` = 1');
  }
  if (!isEmpty(filter)) where.push(getFilterSql(filter, options));

  if (!hasRangeArg) {
    return {
      where,
      limit: 2,
      orderSpec: [options.idCol],
      order: null,
      ensureSingleRow: true,
      hasRangeArg: false,
      keyBase: rest,
    };
  }

  const orderSpec = $order || [options.idCol];

  const boundCols = orderSpec.map((orderItem) => {
    if (orderItem[0] === '!') {
      return `-(${getLookup(orderItem.slice(1), options).numericExpr})`;
    }
    return getLookup(orderItem, options).orderExpr;
  });

  Object.entries({ $after, $before, $since, $until }).forEach(
    ([kind, value]) => {
      if (value) where.push(getBoundCond(boundCols, value, kind));
    },
  );

  const order = orderSpec
    .map((orderItem) => {
      const desc = orderItem[0] === '!';
      const prop = desc ? orderItem.slice(1) : orderItem;
      const lookup = getLookup(prop, options);
      const direction = desc
        ? $last
          ? 'ASC'
          : 'DESC'
        : $last
          ? 'DESC'
          : 'ASC';
      return `${lookup.orderExpr} ${direction}`;
    })
    .join(', ');

  return {
    where,
    orderSpec,
    order,
    limit: Math.min(MAX_LIMIT, $first || $last || MAX_LIMIT),
    ensureSingleRow: false,
    hasRangeArg: true,
    keyBase: rest,
  };
}
