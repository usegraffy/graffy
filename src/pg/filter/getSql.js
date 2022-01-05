import sql, { join, raw } from 'sql-template-tag';
import getAst from './getAst.js';
import { encodePath } from '@graffy/common';

// function getColumnType(column, options) {
//   const sqlType = options.schema.types[column];
//   if (!sqlType) return 'any';

//   if (sqlType[0] === '_') return 'array';
//   if (sqlType === 'jsonb' || sqlType === 'cube') return sqlType;
//   return 'any';
// }

// function getCompatibleTypes(value) {
//   if (value === null) return 'any';
//   if (Array.isArray(value)) return 'array';
//   if (typeof value === 'object') return 'jsonb';
//   if (typeof value === 'number') return 'numeric';
//   if (typeof value === 'string') return 'text';
// }

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
      value.length !== 2 ||
      !Array.isArray(value[0])
    ) {
      throw Error('pg.castValue_bad_cube' + JSON.stringify(value));
    }
    return sql`${sqlOp} cube(${join(value)})`;
  }

  return sql`${sqlOp} ${value}`;
}

export default function getSql(filter, options) {
  function lookup(prop) {
    const [prefix, ...suffix] = encodePath(prop);
    const { types } = options.schema;
    if (!types[prefix]) throw Error('pg.bad_column ' + prefix);
    if (suffix.length && types[prefix] !== 'jsonb')
      throw Error('pg.lookup_not_jsonb ' + prefix);

    return suffix.length
      ? [sql`"${raw(prefix)}" #> ${suffix}`, 'jsonb']
      : [sql`"${raw(prefix)}"`, types[prefix]];
  }

  // function binop(op, left, right) {
  //   const lType = getColumnType(left, options);
  //   const rType = getCompatibleTypes(right);
  //   if (lType === 'any' || rType === 'any' || rType === lType) {
  //     return sql`${lookup(left)} ${raw(op)} ${right}`;
  //   } else {
  //     return sql`(${lookup(left, rType)})::${raw(rType)} ${raw(op)} ${right}`;
  //   }
  // }

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

    const [lhs, type] = lookup(ast[1]);
    const rhs = castValue(ast[2], type, op);

    return sql`${lhs} ${rhs}`;

    // switch (ast[0]) {
    //   case '$eq':
    //     if (ast[2] === null) return sql`${lookup(ast[1])} IS NULL`;
    //     return binop('=', ast[1], ast[2]);
    //   case '$neq':
    //     if (ast[2] === null) return sql`${lookup(ast[1])} IS NOT NULL`;
    //     return binop('<>', ast[1], ast[2]);
    //   case '$lt':
    //     return binop('<', ast[1], ast[2]);
    //   case '$lte':
    //     return binop('<=', ast[1], ast[2]);
    //   case '$gt':
    //     return binop('>', ast[1], ast[2]);
    //   case '$gte':
    //     return binop('>=', ast[1], ast[2]);
    //   case '$re':
    //     return binop('~', ast[1], ast[2]);
    //   case '$ire':
    //     return binop('~*', ast[1], ast[2]);
    //   case '$in':
    //     return sql`${lookup(ast[1])} IN (${join(ast[2])})`;
    //   case '$nin':
    //     return sql`${lookup(ast[1])} NOT IN (${join(ast[2])})`;

    //   case '$cts':
    //     return sql`${lookup(ast[1])} @> ${ast[2]}`;
    //   case '$ctd':
    //     return sql`${lookup(ast[1])} <@ ${ast[2]}`;
    //   case '$ovl':
    //     switch (getColumnType(ast[1])) {
    //       case 'jsonb':
    //       case 'any':
    //         return sql`${lookup(ast[1])} ?| ${
    //           Array.isArray(ast[2]) ? ast[2] : Object.keys(ast[2])
    //         }`;
    //       case 'array':
    //         return sql`${lookup(ast[1])} && ${ast[2]}`;
    //       default:
    //         throw Error('pg.getSql_ovl_unknown_column_type');
    //     }
    //   case '$and':
    //     return sql`(${join(
    //       ast[1].map((node) => getNodeSql(node)),
    //       `) AND (`,
    //     )})`;
    //   case '$or':
    //     return sql`(${join(
    //       ast[1].map((node) => getNodeSql(node)),
    //       `) OR (`,
    //     )})`;
    //   case '$not':
    //     return sql`NOT (${getNodeSql(ast[1])})`;
    //   default:
    //     throw Error('pg.getSql_unknown_operator: ' + ast[0]);
    // }
  }

  return getNodeSql(getAst(filter));
}
