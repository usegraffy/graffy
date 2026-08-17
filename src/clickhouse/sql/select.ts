import {
  isPlainObject,
  isStringishType,
  literal,
  quoteIdent,
  unwrapType,
} from './escape.ts';
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

function getTableSql({ database = 'default', table, final = false }) {
  const tableSql = `${quoteIdent(database)}.${quoteIdent(table)}`;
  return final ? `${tableSql} FINAL` : tableSql;
}

export function mergeProjections(current, incoming) {
  if (current === true || incoming === true) return true;
  if (!isPlainObject(current)) return incoming;
  if (!isPlainObject(incoming)) return current;

  const merged = { ...current };
  Object.entries(incoming).forEach(([key, value]) => {
    merged[key] = key in merged ? mergeProjections(merged[key], value) : value;
  });
  return merged;
}

function nestProjection(path, value) {
  return path.reduceRight((child, key) => ({ [key]: child }), value);
}

function isNativeJsonType(type) {
  const unwrapped = unwrapType(type);
  return (
    unwrapped === 'JSON' ||
    unwrapped?.startsWith('JSON(') ||
    unwrapped === "Object('json')"
  );
}

function getJsonLeafSql(root, path, options) {
  const type = options.schema.types[root];
  if (isNativeJsonType(type)) {
    const subcolumn = [root, ...path].map(quoteIdent).join('.');
    return `ifNull(toJSONString(${subcolumn}), 'null')`;
  }

  if (isStringishType(type)) {
    const pathArgs = path.map((part) => literal(part)).join(', ');
    const raw = `JSONExtractRaw(ifNull(${quoteIdent(root)}, '{}'), ${pathArgs})`;
    return `ifNull(nullIf(${raw}, ''), 'null')`;
  }

  throw Error(`clickhouse.projection_requires_json ${root}`);
}

function getNestedJsonSql(root, projection, path, options) {
  const parts = [literal('{')];
  let count = 0;

  Object.entries(projection).forEach(([key, value]) => {
    if (key[0] === '$' || (value !== true && !isPlainObject(value))) return;
    if (count) parts.push(literal(','));
    parts.push(literal(`${JSON.stringify(key)}:`));
    parts.push(
      value === true
        ? getJsonLeafSql(root, [...path, key], options)
        : getNestedJsonSql(root, value, [...path, key], options),
    );
    count += 1;
  });

  parts.push(literal('}'));
  return `concat(${parts.join(', ')})`;
}

function getProjectionSelectSql(projection, options, orderSpec = []) {
  if (!projection) return '*';

  const roots = new Map<string, any>();
  const addProjection = (rawProp, value) => {
    const prop = rawProp[0] === '!' ? rawProp.slice(1) : rawProp;
    const [root, ...path] = prop.split('.');
    getLookup(root, options);
    const incoming = path.length ? nestProjection(path, value) : value;
    roots.set(
      root,
      roots.has(root) ? mergeProjections(roots.get(root), incoming) : incoming,
    );
  };

  Object.entries(projection).forEach(([prop, value]) => {
    if (prop[0] !== '$' && (value === true || isPlainObject(value))) {
      addProjection(prop, value);
    }
  });
  [options.idCol, options.verCol, ...orderSpec].forEach((prop) => {
    addProjection(prop, true);
  });

  return [...roots.entries()]
    .map(([root, value]) =>
      value === true
        ? quoteIdent(root)
        : `CAST(${getNestedJsonSql(root, value, [], options)}, 'JSON') AS ${quoteIdent(root)}`,
    )
    .join(', ');
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
  const { where, order, limit, groupSpec, orderSpec, ...rest } = getArgSql(
    args,
    options,
  );
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
      orderSpec,
      isAggregate: false,
      aggregateAliases: {},
      groupAliases: [],
      sql: `SELECT ${getProjectionSelectSql(projection, options, orderSpec)} FROM ${getTableSql(options)}${whereClause}${orderClause} LIMIT ${limit}`,
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
    orderSpec,
    isAggregate: true,
    aggregateAliases,
    groupAliases,
    sql: `SELECT ${selectSql} FROM ${getTableSql(options)}${whereClause}${groupClause}${orderClause} LIMIT ${limit}`,
  };
}

export function selectByIds(ids, projection, options) {
  const where = [
    `${quoteIdent(options.idCol)} IN (${ids.map((id) => literal(id)).join(', ')})`,
  ];
  return {
    sql: `SELECT ${getProjectionSelectSql(projection, options)} FROM ${getTableSql(options)} WHERE ${where.join(' AND ')}`,
  };
}
