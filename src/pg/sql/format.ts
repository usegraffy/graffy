import { escapeLiteral } from 'pg';
import { format } from 'sql-formatter';

/**
 * @param {any} value
 * @returns {string}
 */
function formatSqlParam(value) {
  if (value === null || value === undefined) return 'null';
  if (['number', 'boolean'].includes(typeof value)) return value.toString();

  switch (typeof value) {
    case 'number':
    case 'boolean':
      return value.toString();

    case 'string':
      return escapeLiteral(value);

    case 'object':
      if (Array.isArray(value))
        return `array[${value.map(formatSqlParam).join(', ')}]`;
      return `'${JSON.stringify(value)}'`;

    default:
      // shouldn't be reached
      return '';
  }
}

/**
 * @param {import('sql-template-tag').Sql} sql
 * @returns {string}
 */
export default function formatSql(sql) {
  return format(sql.text, {
    language: 'postgresql',
    params: Object.fromEntries(
      sql.values.map((value, idx) => [idx + 1, formatSqlParam(value)]),
    ),
  });
}
