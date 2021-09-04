import sql, { join, raw } from 'sql-template-tag';
import { isEmpty, encodePath } from '@graffy/common';
import { getFilterSql } from '../filter/index.js';

/**
  Uses the args object (typically passed in the $key attribute)

  @param {object} args
  @param {object} options

  @typedef { import('sql-template-tag').Sql } Sql
  @return {{ meta: Sql, where: Sql[], order?: Sql, limit: number }}
*/
export default function getArgSql(
  { $first, $last, $after, $before, $since, $until, $cursor: _, ...rest },
  options,
) {
  const { $order, ...filter } = rest;
  const { prefix, idCol } = options;

  const lookup = (prop) => {
    const [prefix, ...suffix] = encodePath(prop);
    return suffix.length
      ? sql`"${raw(prefix)}" #>> '{"${suffix.join('","')}"}'`
      : sql`"${raw(prefix)}"`;
  };

  const meta = (key) => sql`jsonb_build_object(
    '$key', ${key},
    '$ref', array[${join(prefix)}, "${raw(idCol)}"],
    '$ver', now()
  )`;

  const hasRangeArg =
    $before || $after || $since || $until || $first || $last || $order;

  let key;
  const where = [];
  if (!isEmpty(filter)) {
    where.push(getFilterSql(filter, lookup));
    key = sql`${JSON.stringify(filter)}::jsonb`;
  }

  if (!hasRangeArg) return { meta: meta(key), where, limit: 1 };

  const orderCols = ($order || [idCol]).map(lookup);

  if ($after) where.push(getBoundCond(orderCols, $after, '$after'));
  if ($before) where.push(getBoundCond(orderCols, $before, '$before'));
  if ($since) where.push(getBoundCond(orderCols, $since, '$since'));
  if ($until) where.push(getBoundCond(orderCols, $until, '$until'));

  key = sql`(${join(
    [
      key,
      $order &&
        sql`jsonb_build_object('$order', jsonb_build_array(${join($order)}))`,
      sql`jsonb_build_object('$cursor', jsonb_build_array(${join(orderCols)}))`,
    ].filter(Boolean),
    ` || `,
  )})`;

  return {
    meta: meta(key),
    where,
    order: join(
      orderCols.map((col) => sql`${col} ${$last ? sql`DESC` : sql`ASC`}`),
      `, `,
    ),
    limit: $first || $last,
  };
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
