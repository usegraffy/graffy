import sql, { join, raw } from 'sql-template-tag';
import getAst from './getAst.js';
import { cubeLiteralSql } from '../sql/clauses.js';

const opSql = {
  $and: 'AND', // Not SQL as these are used as delimiters
  $or: 'OR',
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

function getBinarySql(lhs, type, op, value, textLhs) {
  if (value === null && op === '$eq') return sql`${lhs} IS NULL`;
  if (value === null && op === '$neq') return sql`${lhs} IS NOT NULL`;

  const sqlOp = opSql[op];
  if (!sqlOp) throw Error(`pg.getSql_unknown_operator ${op}`);

  if (op === '$in' || op === '$nin') {
    if (type === 'jsonb' && typeof value[0] === 'string') lhs = textLhs;
    return sql`${lhs} ${sqlOp} (${join(value)})`;
  }

  if (op === '$re' || op === '$ire') {
    if (type === 'jsonb') {
      lhs = textLhs;
    } else if (type !== 'text') {
      lhs = sql`(${lhs})::text`;
    }
    return sql`${lhs} ${sqlOp} ${String(value)}`;
  }

  if (type === 'jsonb') {
    if (typeof value === 'string') {
      return sql`${textLhs} ${sqlOp} ${value}`;
    }
    return sql`${lhs} ${sqlOp} ${JSON.stringify(value)}::jsonb`;
  }

  if (type === 'cube') return sql`${lhs} ${sqlOp} ${cubeLiteralSql(value)}`;

  return sql`${lhs} ${sqlOp} ${value}`;
}

function getNodeSql(ast, options) {
  if (typeof ast === 'boolean') return ast;
  const op = ast[0];

  if (op === '$and' || op === '$or') {
    // Handle variadic operators
    return sql`(${join(
      ast[1].map((node) => getNodeSql(node, options)),
      `) ${opSql[op]} (`,
    )})`;
  } else if (op === '$not') {
    // Handle unary operators
    return sql`${opSql[op]} (${getNodeSql(ast[1], options)})`;
  }

  if (op === '$sub') {
    // Handle joins.
    const joinName = ast[1];
    if (!options.joins[joinName]) throw Error(`pg.no_join ${joinName}`);
    const { idCol } = options;
    const joinOptions = options.joins[joinName];
    const { table: joinTable, refCol } = options.joins[joinName];
    return sql`"${raw(idCol)}" IN (SELECT "${raw(refCol)}" FROM "${raw(
      joinTable,
    )}" WHERE ${getNodeSql(ast[2], joinOptions)})`;
  }

  // It is a binary operator

  const [prefix, ...suffix] = ast[1].split('.');
  const { types = {} } = options.schema;
  if (!types[prefix]) throw Error(`pg.no_column ${prefix}`);

  if (types[prefix] === 'jsonb') {
    const [lhs, textLhs] = suffix.length
      ? [
          sql`"${raw(prefix)}" #> ${suffix}`,
          sql`"${raw(prefix)}" #>> ${suffix}`,
        ]
      : [sql`"${raw(prefix)}"`, sql`"${raw(prefix)}" #>> '{}'`];

    return getBinarySql(lhs, 'jsonb', op, ast[2], textLhs);
  } else {
    if (suffix.length) throw Error(`pg.lookup_not_jsonb ${prefix}`);
    return getBinarySql(sql`"${raw(prefix)}"`, types[prefix], op, ast[2]);
  }
}

export default function getSql(filter, options) {
  const ast = getAst(filter);
  return getNodeSql(ast, options);
}
