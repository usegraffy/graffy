import { isEmpty } from '@graffy/common';
import getFilterSql from '../filter/getSql.ts';
import {
  isNullableType,
  isNumericType,
  literal,
  unwrapType,
} from './escape.ts';
import { getLookup } from './lookup.ts';

const MAX_LIMIT = 4096;

// A NULL-free stand-in used only as the second tuple element when
// isNotNull() is already 0, so its value never decides the order.
function getNullDefault(type) {
  if (isNumericType(type)) return '0';
  const unwrapped = unwrapType(type) || '';
  if (unwrapped === 'String' || /^FixedString\(\d+\)$/.test(unwrapped)) {
    return "''";
  }
  return null;
}

// Describes one $order item: the SQL that goes into the bound tuple, how a
// cursor value maps onto it, and the ORDER BY fragment.
//
// A tuple comparison containing NULL is NULL, so rows with a NULL order
// column would silently drop off every page after the first. For nullable
// columns the tuple gets (isNotNull(col), ifNull(col, default)) instead, and
// ORDER BY pins NULLS FIRST so SQL agrees with graffy's cursor encoding,
// where null sorts below every number and string.
function getOrderCol(orderItem, options, $last) {
  const desc = orderItem[0] === '!';
  const prop = desc ? orderItem.slice(1) : orderItem;
  const lookup = getLookup(prop, options);

  // Descending is implemented by negating, which only works on numbers.
  // JSON paths are parsed from text with toFloat64OrZero, so they pass.
  if (desc && !lookup.isJsonPath && !isNumericType(lookup.type)) {
    throw Error(`clickhouse_arg.order_desc_non_numeric ${prop}`);
  }

  const nullable =
    lookup.isMapPath || (!lookup.isJsonPath && isNullableType(lookup.type));
  const nullDefault = nullable ? getNullDefault(lookup.type) : null;

  const direction = desc === !!$last ? 'ASC' : 'DESC';
  const nulls =
    nullDefault === null ? '' : $last ? ' NULLS LAST' : ' NULLS FIRST';
  const order = `${lookup.orderExpr} ${direction}${nulls}`;

  if (nullDefault === null) {
    return {
      order,
      exprs: [desc ? `-(${lookup.numericExpr})` : lookup.orderExpr],
      toBound: (value) => [literal(value)],
    };
  }

  const valueExpr = desc
    ? `-(ifNull(${lookup.numericExpr}, 0))`
    : `ifNull(${lookup.orderExpr}, ${nullDefault})`;

  return {
    order,
    exprs: [`isNotNull(${lookup.rawExpr})`, valueExpr],
    toBound: (value) =>
      value === null || value === undefined
        ? ['0', nullDefault]
        : ['1', literal(value)],
  };
}

function getBoundCond(orderCols, bound, kind) {
  if (
    !Array.isArray(bound) ||
    !bound.length ||
    orderCols.length !== bound.length
  ) {
    throw Error(`clickhouse_arg.bad_query bound:${JSON.stringify(bound)}`);
  }

  const lhs = `(${orderCols.flatMap((col) => col.exprs).join(', ')})`;
  const rhs = `(${orderCols.flatMap((col, ix) => col.toBound(bound[ix])).join(', ')})`;

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
  const orderCols = orderSpec.map((orderItem) =>
    getOrderCol(orderItem, options, $last),
  );

  Object.entries({ $after, $before, $since, $until }).forEach(
    ([kind, value]) => {
      if (value) where.push(getBoundCond(orderCols, value, kind));
    },
  );

  return {
    where,
    orderSpec,
    order: orderCols.map((col) => col.order).join(', '),
    groupSpec,
    limit: Math.min(MAX_LIMIT, $first || $last || MAX_LIMIT),
    ensureSingleRow: false,
    hasRangeArg: true,
    hasCursor: true,
    keyBase: rest,
  };
}
