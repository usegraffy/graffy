import sql, { join, raw, empty } from 'sql-template-tag';
import { isEmpty, makePath } from '@graffy/common';
import { getSql } from '../filter';

import debug from 'debug';
const log = debug('graffy:pg:select');

const MAX_LIMIT = 4096;

export function selectByArgs(args, options, { forUpdate } = {}) {
  const { prefix, table } = options;
  const { where, order, limit, key } = getArgSql(args, options);
  const clampedLimit = forUpdate
    ? 1
    : Math.min(MAX_LIMIT, Math.max(0, limit || 0));

  return sql`
    SELECT
    ${getSelectCols(options)} || jsonb_build_object(
      '$key', ${key},
      '$ref', array[${join(prefix)}, "${raw(options.idCol)}"]
    )
    FROM "${raw(table)}"
    ${where.length ? sql`WHERE ${join(where, ` AND `)}` : empty}
    ORDER BY ${order} LIMIT ${clampedLimit}
    ${forUpdate ? sql`FOR UPDATE` : empty}
  `;
}

export function selectByIds(ids, options, { forUpdate } = {}) {
  const { table, idCol } = options;
  return sql`
    SELECT
    ${getSelectCols(options)} || jsonb_build_object(
      '$key', "${raw(options.idCol)}"
    )
    FROM "${raw(table)}"
    WHERE "${raw(idCol)}" IN (${join(ids)})
    ${forUpdate ? sql`FOR UPDATE` : empty}
  `;
}

export function selectUpdatedSince(version, options) {
  const { table, verCol } = options;
  return sql`
    SELECT ${getSelectCols(options)} || jsonb_build_object(
      '$key', "${raw(options.idCol)}"
    )
    FROM "${raw(table)}"
    WHERE "${raw(verCol)}" > ${version}
    LIMIT ${MAX_LIMIT}
  `;
}

export async function readSql(sqlQuery, client) {
  log(sqlQuery.text);
  log(sqlQuery.values);

  sqlQuery.rowMode = 'array';
  const result = (await client.query(sqlQuery)).rows;
  log(result);
  return result;
}

/*--- helpers ---*/

function getSelectCols(options) {
  return join(
    [
      options.defCol && raw(`"${options.defCol}"`),
      !isEmpty(options.columns) &&
        sql`jsonb_build_object( ${join(
          Object.entries(options.columns).flatMap(([column, { prop }]) => [
            raw(`'${prop}'`), // Comes from options, considered trusted.
            raw(`"${column}"`),
          ]),
          ', ',
        )} )`,
    ].filter(Boolean),
    ` || `,
  );
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

function getArgSql(
  {
    $first,
    $last,
    $after,
    $before,
    $since,
    $until,
    $order,
    $cursor: _,
    id,
    ...filter
  },
  options,
) {
  const { args } = options;

  const lookup = (prop) => {
    // Fast path for the direct arg lookup case.
    if (args[prop]) return raw(`"${args[prop].name}"`);

    const propArray = makePath(prop);
    const suffix = [];
    while (propArray.length) {
      suffix.unshift(propArray.pop());
      const propPrefix = propArray.join('.');
      if (args[propPrefix]) {
        return sql`"${raw(args[propPrefix].name)}" #>> {${suffix.join(',')}}`;
      }
    }
    throw Error('pg.unknown_arg:' + prop);
  };

  const orderCols = ($order || [options.idCol]).map(lookup);
  const where = [];

  if (!isEmpty(filter)) where.push(...getSql(filter, lookup));
  if ($after) where.push(getBoundCond(orderCols, $after, '$after'));
  if ($before) where.push(getBoundCond(orderCols, $before, '$before'));
  if ($since) where.push(getBoundCond(orderCols, $since, '$since'));
  if ($until) where.push(getBoundCond(orderCols, $until, '$until'));

  const cursor = sql`jsonb_build_array(${join(orderCols)})`;
  const key = isEmpty(filter)
    ? cursor
    : sql`${JSON.stringify(
        filter,
      )}::jsonb || jsonb_build_object('$cursor', ${cursor})`;

  return {
    key,
    where,
    order: join(
      orderCols.map((col) => sql`${col} ${$last ? sql`DESC` : sql`ASC`}`),
    ),
    limit: $first || $last,
  };
}
