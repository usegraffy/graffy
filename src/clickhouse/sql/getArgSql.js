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
  const groupSpec =
    $group === true
      ? true
      : Array.isArray($group) && $group.length
        ? $group
        : null;

  const hasRangeArg = !!(
    $before ||
    $after ||
    $since ||
    $until ||
    $first ||
    $last ||
    $all
  );

  if ($order && $group) {
    throw Error('clickhouse_arg.order_and_group_unsupported');
  }

  if (($order || ($group && $group !== true)) && !hasRangeArg) {
    throw Error('clickhouse_arg.range_arg_expected');
  }

  const where = [];
  if (!isEmpty(filter)) where.push(getFilterSql(filter, options));

  if (!hasRangeArg) {
    return {
      where,
      limit: groupSpec ? 1 : 2,
      orderSpec: groupSpec && groupSpec !== true ? groupSpec : [options.idCol],
      order: null,
      groupSpec,
      ensureSingleRow: !groupSpec,
      hasRangeArg: false,
      hasCursor: false,
      keyBase: rest,
    };
  }

  if (groupSpec === true) {
    return {
      where,
      orderSpec: [],
      order: null,
      groupSpec,
      limit: 1,
      ensureSingleRow: false,
      hasRangeArg: true,
      hasCursor: false,
      keyBase: rest,
    };
  }

  const orderSpec = groupSpec || $order || [options.idCol];

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
    groupSpec,
    limit: Math.min(MAX_LIMIT, $first || $last || MAX_LIMIT),
    ensureSingleRow: false,
    hasRangeArg: true,
    hasCursor: true,
    keyBase: rest,
  };
}
