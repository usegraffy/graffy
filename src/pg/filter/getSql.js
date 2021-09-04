import sql, { join, raw } from 'sql-template-tag';
import getAst from './getAst.js';

export default function getSql(filter, getLookupSql) {
  function lhs(string) {
    if (string.substr(0, 3) === 'el$') return sql`"${raw(string)}"`;
    return getLookupSql(string);
  }

  function getNodeSql(ast) {
    switch (ast[0]) {
      case '$eq':
        return sql`${lhs(ast[1])} = ${ast[2]}`;
      case '$ne':
        return sql`${lhs(ast[1])} <> ${ast[2]}`;
      case '$lt':
        return sql`${lhs(ast[1])} < ${ast[2]}`;
      case '$lte':
        return sql`${lhs(ast[1])} <= ${ast[2]}`;
      case '$gt':
        return sql`${lhs(ast[1])} > ${ast[2]}`;
      case '$gte':
        return sql`${lhs(ast[1])} >= ${ast[2]}`;
      case '$in':
        return sql`${lhs(ast[1])} IN (${join(ast[2])})`;
      case '$nin':
        return sql`${lhs(ast[1])} NOT IN (${join(ast[2])})`;
      case '$cts':
        return sql`${lhs(ast[1])} @> ${ast[2]}`;
      case '$ctd':
        return sql`${lhs(ast[1])} <@ ${ast[2]}`;
      case '$ovp':
        return sql`${lhs(ast[1])} && ${ast[2]}`;
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
        return sql`(SELECT bool_or(${getNodeSql(ast[3])}) FROM UNNEST(${lhs(
          ast[1],
        )}) ${lhs(ast[2])})`;
      case '$all':
        return sql`(SELECT bool_and(${getNodeSql(ast[3])}) FROM UNNEST(${lhs(
          ast[1],
        )}) ${lhs(ast[2])})`;
      case '$has':
        return sql`(SELECT bool_or(${join(
          ast[3].map((node) => getNodeSql(node)),
          `) AND bool_or(`,
        )}) FROM UNNEST(${lhs(ast[1])}) ${lhs(ast[2])})`;
    }
  }

  return getNodeSql(getAst(filter));
}
