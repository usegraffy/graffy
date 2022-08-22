import sql, { join } from 'sql-template-tag';
import { isEmpty } from '@graffy/common';
import { getFilterSql } from '../filter/index.js';
import { getArgMeta, getAggMeta } from './getMeta';
import { getJsonBuildTrusted, lookup } from './clauses.js';

/**
  Uses the args object (typically passed in the $key attribute)

  @param {object} args
  @param {{prefix: string, idCol: string}} options

  @typedef { import('sql-template-tag').Sql } Sql
  @return {{ meta: Sql, where: Sql[], order?: Sql, group?: Sql, limit: number }}
*/
export default function getArgSql(
  { $first, $last, $after, $before, $since, $until, $all, $cursor: _, ...rest },
  options,
) {
  const { $order, $group, ...filter } = rest;
  const { prefix, idCol } = options;

  if ($order && $group) {
    // TODO: Allow this.
    throw Error('pg_arg.order_and_group_unsupported in ' + prefix);
  }

  const meta = (key) =>
    $group ? getAggMeta(key, $group, options) : getArgMeta(key, options);

  const groupCols =
    Array.isArray($group) && $group.length && $group.map(lookup);

  const group = groupCols ? join(groupCols, ', ') : undefined;

  const hasRangeArg =
    $before || $after || $since || $until || $first || $last || $all || $order;

  let filterKey;
  const where = [];
  if (!isEmpty(filter)) {
    where.push(getFilterSql(filter, options));
    filterKey = sql`${JSON.stringify(filter)}::jsonb`;
  }

  if (!hasRangeArg) return { meta: meta(filterKey), where, group, limit: 1 };

  const orderCols = ($order || [idCol]).map((orderItem) =>
    orderItem[0] === '!'
      ? sql`-(${lookup(orderItem.slice(1))})::float8`
      : lookup(orderItem),
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
          ? sql`${lookup(orderItem.slice(1))} ${$last ? sql`ASC` : sql`DESC`}`
          : sql`${lookup(orderItem)} ${$last ? sql`DESC` : sql`ASC`}`,
      ),
      `, `,
    );

  const orderKey =
    $order &&
    getJsonBuildTrusted({ $order: sql`${JSON.stringify($order)}::jsonb` });

  const cursorKey = getJsonBuildTrusted({
    $cursor:
      $group === true
        ? sql`''`
        : sql`jsonb_build_array(${join(groupCols || orderCols)})`,
  });

  const groupKey =
    $group &&
    getJsonBuildTrusted({ $group: sql`${JSON.stringify($group)}::jsonb` });

  const key = sql`(${join(
    [filterKey, groupKey, orderKey, cursorKey].filter(Boolean),
    ` || `,
  )})`;

  return {
    meta: meta(key),
    where,
    order,
    group,
    limit: $first || $last,
  };
}

function getBoundCond(orderCols, bound, kind) {
  if (!Array.isArray(bound)) {
    throw Error('pg_arg.bad_query bound : ' + JSON.stringify(bound));
  }

  const lhs = orderCols[0];
  const rhs = bound[0];
  if (orderCols.length > 1 && bound.length > 1) {
    const subCond = getBoundCond(orderCols.slice(1), bound.slice(1), kind);
    switch (kind) {
      case '$after':
      case '$since':
        return sql`${lhs} > ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
      case '$before':
      case '$until':
        return sql`${lhs} < ${rhs} OR ${lhs} = ${rhs} AND (${subCond})`;
    }
  } else {
    switch (kind) {
      case '$after':
        return sql`${lhs} > ${rhs}`;
      case '$since':
        return sql`${lhs} >= ${rhs}`;
      case '$before':
        return sql`${lhs} < ${rhs}`;
      case '$until':
        return sql`${lhs} <= ${rhs}`;
    }
  }
}
