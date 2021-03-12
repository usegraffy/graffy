import sql, { join } from 'sql-template-tag';
import { unwrapObject, makePath } from '@graffy/common';

export function getSql(params, getLookupSql) {
  return Object.keys(params).map((name) => {
    const value = params[name];
    const lhs = getLookupSql(name);
    if (typeof value !== 'object') return sql`${lhs} = ${value}`;
    if (value === null) return sql`${lhs} IS NULL`;

    return join(
      Object.keys(value).map((operator) => {
        const rhs = value[operator];
        switch (operator) {
          case '$eq':
            return sql`${lhs} = ${rhs}`;
          case '$ne':
            return sql`${lhs} <> ${rhs}`;
          case '$lt':
            return sql`${lhs} < ${rhs}`;
          case '$lte':
            return sql`${lhs} <= ${rhs}`;
          case '$gt':
            return sql`${lhs} > ${rhs}`;
          case '$gte':
            return sql`${lhs} >= ${rhs}`;
          case '$in':
            return sql`${lhs} IN ${rhs}`;
          case '$nin':
            return sql`${lhs} NOT IN ${rhs}`;
          case '$cts':
            return sql`${lhs} @> ${rhs}`;
          case '$ctd':
            return sql`${lhs} <@ ${rhs}`;
          case '$ovp':
            return sql`${lhs} && ${rhs}`;
        }
      }),
      ` AND `,
    );
  });
}

export function filterObject(params, object) {
  return Object.keys(params).every((path) => {
    const value = params[path];
    const lhs = unwrapObject(object, makePath(path));
    if (typeof value !== 'object') return lhs === value;
    if (value === null) return lhs === null || typeof lhs === 'undefined';

    return Object.keys(value).every((operator) => {
      const rhs = value[operator];
      switch (operator) {
        case '$eq':
          return lhs === rhs;
        case '$ne':
          return lhs !== rhs;
        case '$lt':
          return lhs < rhs;
        case '$lte':
          return lhs <= rhs;
        case '$gt':
          return lhs > rhs;
        case '$gte':
          return lhs >= rhs;
        case '$in':
          return Array.isArray(rhs) && rhs.includes(lhs);
        case '$nin':
          return !Array.isArray(rhs) || !rhs.includes(lhs);
      }
    });
  });
}
