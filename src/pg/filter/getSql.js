import sql, { join, raw } from 'sql-template-tag';
import getAst from './getAst.js';
import { encodePath } from '@graffy/common';
import { vertexSql } from '../sql/clauses.js';

const opSql = {
  $and: `AND`, // Not SQL as these are used as delimiters
  $or: `OR`,
  $not: sql`NOT`,
  $eq: sql`=`,
  $neq: sql`<>`,
  $in: sql`IN`,
  $nin: sql`NOT IN`,
  $lt: sql`<`,
  $lte: sql`<=`,
  $gt: sql`>`,
  $gte: sql`>=`,
  $re: sql`~`,
  $ire: sql`~*`,
  $cts: sql`@>`,
  $ctd: sql`<@`,
};

function castValue(value, type, op) {
  if (value === null && op === '$eq') return sql`IS NULL`;
  if (value === null && op === '$neq') return sql`IS NOT NULL`;

  const sqlOp = opSql[op];
  if (!sqlOp) throw Error('pg.getSql_unknown_operator ' + op);

  if (op === '$in' || op === '$nin') {
    return sql`${sqlOp} (${join(value)})`;
  }

  if (type === 'jsonb') {
    return sql`${sqlOp} ${JSON.stringify(value)}::jsonb`;
  }

  if (type === 'cube') {
    if (
      !Array.isArray(value) ||
      !value.length ||
      (Array.isArray(value[0]) && value.length !== 2)
    ) {
      throw Error('pg.castValue_bad_cube' + JSON.stringify(value));
    }
    return Array.isArray(value[0])
      ? sql`cube(${vertexSql(value[0])}, ${vertexSql(value[1])})`
      : sql`cube(${vertexSql(value)})`;
  }

  return sql`${sqlOp} ${value}`;
}

export default function getSql(filter, options) {
  function getNodeSql(ast) {
    if (typeof ast === 'boolean') return ast;
    const op = ast[0];

    if (op === '$and' || op === '$or') {
      // Handle variadic operators
      return sql`(${join(
        ast[1].map((node) => getNodeSql(node)),
        `) ${opSql[op]} (`,
      )})`;
    } else if (op === '$not') {
      // Handle unary operators
      return sql`${opSql[op]} (${getNodeSql(ast[1])})`;
    }

    // It is a binary operator

    const [prefix, ...suffix] = encodePath(ast[1]);
    const { types } = options.schema;
    if (!types[prefix]) throw Error('pg.no_column ' + prefix);
    if (suffix.length && types[prefix] !== 'jsonb') {
      throw Error('pg.lookup_not_jsonb ' + prefix);
    }

    const [lhs, type] = suffix.length
      ? [sql`"${raw(prefix)}" #> ${suffix}`, 'jsonb']
      : [sql`"${raw(prefix)}"`, types[prefix]];

    const rhs = castValue(ast[2], type, op);

    return sql`${lhs} ${rhs}`;
  }

  return getNodeSql(getAst(filter));
}
