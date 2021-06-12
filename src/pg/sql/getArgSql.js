import sql, { join, raw } from 'sql-template-tag';
import { isEmpty, encodePath } from '@graffy/common';
import { getFilterSql } from '../filter/index.js';

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

export default function getArgSql(
  { $first, $last, $after, $before, $since, $until, $cursor: _, ...rest },
  options,
) {
  const { $order, ...filter } = rest;
  const { args, prefix } = options;

  const lookupExpr = (prefix, suffix = []) => {
    const { role, name } = args[prefix];
    return role === 'gin'
      ? sql`"${raw(name)}" #>> '{"${[prefix].concat(suffix).join('","')}"}'`
      : suffix.length
      ? sql`"${raw(name)}" #>> '{"${suffix.join('","')}"}'`
      : sql`"${raw(name)}"`;
  };

  const lookup = (prop) => {
    // Fast path for the direct arg lookup case.
    if (args[prop]) return lookupExpr(prop);

    const propArray = encodePath(prop);
    const suffix = [];
    while (propArray.length) {
      suffix.unshift(propArray.pop());
      const propPrefix = propArray.join('.');
      if (args[propPrefix]) return lookupExpr(propPrefix, suffix);
    }
    throw Error('pg.unknown_arg:' + prop);
  };

  const attrs = (key) => sql`jsonb_build_object(
    '$key', ${key},
    '$ref', array[${join(prefix)}, "${raw(options.idCol)}"],
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

  if (!hasRangeArg) return { attrs: attrs(key), where, limit: 1 };

  const orderCols = ($order || [options.idCol]).map(lookup);

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
    attrs: attrs(key),
    where,
    order: join(
      orderCols.map((col) => sql`${col} ${$last ? sql`DESC` : sql`ASC`}`),
      `, `,
    ),
    limit: $first || $last,
  };
}
