import {
  isPlainObject,
  isStringishType,
  literal,
  quoteIdent,
} from '../sql/escape.js';
import { getLookup } from '../sql/lookup.js';
import getAst from './getAst.js';

function getTableSql({ database = 'default', table, final = true }) {
  const tableSql = `${quoteIdent(database)}.${quoteIdent(table)}`;
  return final ? `${tableSql} FINAL` : tableSql;
}

function getNullCheckSql(lookup, op) {
  if (lookup.isJsonPath) {
    const missingExpr = `isNull(nullIf(${lookup.rawExpr}, ''))`;
    return op === '$eq' ? missingExpr : `NOT (${missingExpr})`;
  }
  return op === '$eq'
    ? `isNull(${lookup.rawExpr})`
    : `NOT isNull(${lookup.rawExpr})`;
}

function getRegexSql(lookup, op, value) {
  const pattern = literal(String(value));
  if (op === '$ire') {
    return `match(${lookup.textExpr}, concat('(?i)', ${pattern}))`;
  }
  return `match(${lookup.textExpr}, ${pattern})`;
}

function getInSql(lookup, op, value, type) {
  const values = value.filter((item) => item !== null);
  const hasNull = values.length !== value.length;
  const lhs =
    lookup.isJsonPath || isStringishType(type)
      ? lookup.textExpr
      : lookup.rawExpr;

  const inExpr = values.length
    ? `${lhs} IN (${values.map((item) => literal(item)).join(', ')})`
    : null;
  const nullExpr = hasNull ? getNullCheckSql(lookup, '$eq') : null;

  if (op === '$in') {
    if (inExpr && nullExpr) return `(${inExpr} OR ${nullExpr})`;
    if (inExpr) return inExpr;
    return nullExpr || '0';
  }

  if (inExpr && nullExpr) return `NOT (${inExpr} OR ${nullExpr})`;
  if (inExpr) return `NOT (${inExpr})`;
  return nullExpr ? `NOT (${nullExpr})` : '1';
}

function getCtsSql(lookup, value) {
  if (Array.isArray(value) && value.every((item) => isPlainObject(item))) {
    return value
      .map((needle) => {
        const conditions = Object.entries(needle).map(
          ([k, v]) =>
            `JSONExtractRaw(item, ${literal(k)}) = ${literal(JSON.stringify(v))}`,
        );
        return `arrayExists(item -> (${conditions.join(' AND ')}), JSONExtractArrayRaw(ifNull(${lookup.rootExpr}, '[]')))`;
      })
      .join(' AND ');
  }

  if (isPlainObject(value)) {
    const checks = Object.entries(value).map(
      ([k, v]) =>
        `JSONExtractRaw(ifNull(${lookup.rootExpr}, '{}'), ${literal(k)}) = ${literal(JSON.stringify(v))}`,
    );
    return checks.join(' AND ');
  }

  return `positionUTF8(ifNull(${lookup.rootExpr}, ''), ${literal(JSON.stringify(value))}) > 0`;
}

function getSimpleBinarySql(lookup, op, value) {
  const opSql = {
    $eq: '=',
    $neq: '!=',
    $lt: '<',
    $lte: '<=',
    $gt: '>',
    $gte: '>=',
  }[op];
  if (!opSql) throw Error(`clickhouse.getSql_unknown_operator ${op}`);

  const lhs = lookup.isJsonPath
    ? typeof value === 'string'
      ? lookup.textExpr
      : lookup.numericExpr
    : lookup.rawExpr;

  return `${lhs} ${opSql} ${literal(value)}`;
}

function getBinarySql(node, options) {
  const [op, prop, value] = node;
  const lookup = getLookup(prop, options);
  const type = lookup.type;

  if (value === null && (op === '$eq' || op === '$neq')) {
    return getNullCheckSql(lookup, op);
  }

  if (op === '$in' || op === '$nin') {
    return getInSql(lookup, op, value, type);
  }

  if (op === '$re' || op === '$ire') {
    return getRegexSql(lookup, op, value);
  }

  if (op === '$cts') {
    return getCtsSql(lookup, value);
  }

  if (op === '$ctd' || op === '$keycts' || op === '$keyctd') {
    throw Error(`clickhouse.unsupported_operator ${op}`);
  }

  return getSimpleBinarySql(lookup, op, value);
}

function getNodeSql(ast, options) {
  if (typeof ast === 'boolean') return ast ? '1' : '0';
  const [op] = ast;

  if (op === '$and' || op === '$or') {
    const delim = op === '$and' ? ' AND ' : ' OR ';
    return `(${ast[1].map((node) => getNodeSql(node, options)).join(delim)})`;
  }

  if (op === '$not') {
    return `NOT (${getNodeSql(ast[1], options)})`;
  }

  if (op === '$sub') {
    const joinName = ast[1];
    const joinOptions = options.joins?.[joinName];
    if (!joinOptions) throw Error(`clickhouse.no_join ${joinName}`);

    const where = [getNodeSql(ast[2], joinOptions)];

    const rootIdCol = quoteIdent(options.idCol);
    const joinRefCol = quoteIdent(joinOptions.refCol);
    return `${rootIdCol} IN (SELECT ${joinRefCol} FROM ${getTableSql(joinOptions)} WHERE ${where.join(' AND ')})`;
  }

  return getBinarySql(ast, options);
}

export default function getFilterSql(filter, options) {
  const ast = getAst(filter);
  return getNodeSql(ast, options);
}
