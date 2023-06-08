import sql, { join } from 'sql-template-tag';
import { isEmpty } from '@graffy/common';
import { getFilterSql } from '../filter/index.js';
import { getArgMeta, getAggMeta } from './getMeta';
import { getJsonBuildTrusted, lookup } from './clauses.js';

/**
  Uses the args object (typically passed in the $key attribute)

  @param {object} args
  @param {{prefix: string, idCol: string, verDefault: string}} options

  @typedef { import('sql-template-tag').Sql } Sql
  @return {{ meta: Sql, where: Sql[], order?: Sql, group?: Sql, limit: number, ensureSingleRow: boolean }}
*/
export default function getArgSql(
  { $first, $last, $after, $before, $since, $until, $all, $cursor: _, ...rest },
  options,
) {
  const { $order, $group, ...filter } = rest;
  const { prefix, idCol } = options;

  const meta = (key) =>
    $group ? getAggMeta(key, options) : getArgMeta(key, options);

  const hasRangeArg =
    $before || $after || $since || $until || $first || $last || $all;

  if ($order && $group) {
    // TODO: Allow this.
    throw Error(`pg_arg.order_and_group_unsupported in ${prefix}`);
  }

  if (($order || ($group && $group !== true)) && !hasRangeArg) {
    throw Error(`pg_arg.range_arg_expected in ${prefix}`);
  }

  const baseKey = sql`${JSON.stringify(rest)}::jsonb`;
  const where = [];

  if (!isEmpty(filter)) where.push(getFilterSql(filter, options));

  if (!hasRangeArg)
    return {
      meta: meta(baseKey),
      where,
      limit: 1,
      ensureSingleRow: $group === true,
    };

  const groupCols =
    Array.isArray($group) &&
    $group.length &&
    $group.map((prop) => lookup(prop, options));

  const group = groupCols ? join(groupCols, ', ') : undefined;

  const orderCols = ($order || [idCol]).map((orderItem) =>
    orderItem[0] === '!'
      ? sql`-(${lookup(orderItem.slice(1), options)})::float8`
      : lookup(orderItem, options),
  );

  Object.entries({ $after, $before, $since, $until }).forEach(
    ([name, value]) => {
      if (value) where.push(getBoundCond(orderCols, value, name));
    },
  );

  const order =
    !$group &&
    join(
      ($order || [idCol]).map((orderItem) =>
        orderItem[0] === '!'
          ? sql`${lookup(orderItem.slice(1), options)} ${
              $last ? sql`ASC` : sql`DESC`
            }`
          : sql`${lookup(orderItem, options)} ${$last ? sql`DESC` : sql`ASC`}`,
      ),
      ', ',
    );

  const cursorKey = getJsonBuildTrusted({
    $cursor:
      $group === true
        ? sql`''`
        : sql`jsonb_build_array(${join(groupCols || orderCols)})`,
  });

  const key = sql`(${baseKey} || ${cursorKey})`;

  return {
    meta: meta(key),
    where,
    order,
    group,
    limit: $first || $last,
    ensureSingleRow: true,
  };
}

function getBoundCond(orderCols, bound, kind) {
  if (!Array.isArray(bound) || orderCols.length === 0 || bound.length === 0) {
    throw Error(`pg_arg.bad_query bound : ${JSON.stringify(bound)}`);
  }

  switch (kind) {
    case '$after':
      return sql`(${join(orderCols, ',')}) > (${join(bound, ',')})`;
    case '$since':
      return sql`(${join(orderCols, ',')}) >= (${join(bound, ',')})`;
    case '$before':
      return sql`(${join(orderCols, ',')}) < (${join(bound, ',')})`;
    case '$until':
      return sql`(${join(orderCols, ',')}) <= (${join(bound, ',')})`;
  }
}
