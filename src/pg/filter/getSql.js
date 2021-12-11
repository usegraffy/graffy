import sql, { join, raw } from 'sql-template-tag';
import getAst from './getAst.js';

function defaultColumnType(_) {
  return 'any';
}

function getCompatibleTypes(value) {
  if (value === null) return 'any';
  if (Array.isArray(value)) return 'array';
  if (typeof value === 'object') return 'jsonb';
  if (typeof value === 'number') return 'numeric';
  if (typeof value === 'string') return 'text';
}

export default function getSql(
  filter,
  getLookupSql,
  getColumnType = defaultColumnType,
) {
  function lookup(string, type) {
    if (string.substr(0, 3) === 'el$') return sql`"${raw(string)}"`;
    return getLookupSql(string, type);
  }

  function binop(op, left, right) {
    const lType = left.substr(0, 3) === 'el$' ? 'any' : getColumnType(left);
    const rType = getCompatibleTypes(right);
    if (lType === 'any' || rType === 'any' || rType === lType) {
      return sql`${lookup(left)} ${raw(op)} ${right}`;
    } else {
      return sql`(${lookup(left, rType)})::${raw(rType)} ${raw(op)} ${right}`;
    }
  }

  function getNodeSql(ast) {
    switch (ast[0]) {
      case '$eq':
        if (ast[2] === null) return sql`${lookup(ast[1])} IS NULL`;
        return binop('=', ast[1], ast[2]);
      case '$neq':
        if (ast[2] === null) return sql`${lookup(ast[1])} IS NOT NULL`;
        return binop('<>', ast[1], ast[2]);
      case '$lt':
        return binop('<', ast[1], ast[2]);
      case '$lte':
        return binop('<=', ast[1], ast[2]);
      case '$gt':
        return binop('>', ast[1], ast[2]);
      case '$gte':
        return binop('>=', ast[1], ast[2]);
      case '$re':
        return binop('~', ast[1], ast[2]);
      case '$ire':
        return binop('~*', ast[1], ast[2]);
      case '$in':
        return sql`${lookup(ast[1])} IN (${join(ast[2])})`;
      case '$nin':
        return sql`${lookup(ast[1])} NOT IN (${join(ast[2])})`;

      // TODO: $any, $and and $has should have different cases based on
      // column type (array vs. json)
      case '$cts':
        return sql`${lookup(ast[1])} @> ${ast[2]}`;
      case '$ctd':
        return sql`${lookup(ast[1])} <@ ${ast[2]}`;
      case '$ovl':
        switch (getColumnType(ast[1])) {
          case 'jsonb':
          case 'any':
            return sql`${lookup(ast[1])} ?| ${
              Array.isArray(ast[2]) ? ast[2] : Object.keys(ast[2])
            }`;
          case 'array':
            return sql`${lookup(ast[1])} && ${ast[2]}`;
          default:
            throw Error('pg.getSql_ovl_unknown_column_type');
        }
      case '$and':
        return sql`(${join(
          ast[1].map((node) => getNodeSql(node)),
          `) AND (`,
        )})`;
      case '$or':
        return sql`(${join(
          ast[1].map((node) => getNodeSql(node)),
          `) OR (`,
        )})`;
      case '$not':
        return sql`NOT (${getNodeSql(ast[1])})`;
      case '$any':
        return sql`(SELECT bool_or(${getNodeSql(ast[3])}) FROM UNNEST(${lookup(
          ast[1],
        )}) ${lookup(ast[2])})`;
      case '$all':
        return sql`(SELECT bool_and(${getNodeSql(ast[3])}) FROM UNNEST(${lookup(
          ast[1],
        )}) ${lookup(ast[2])})`;
      case '$has':
        return sql`(SELECT bool_or(${join(
          ast[3].map((node) => getNodeSql(node)),
          `) AND bool_or(`,
        )}) FROM UNNEST(${lookup(ast[1])}) ${lookup(ast[2])})`;
      default:
        throw Error('pg.getSql_unknown_operator: ' + ast[0]);
    }
  }

  return getNodeSql(getAst(filter));
}
