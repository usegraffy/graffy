import { format } from 'sql-formatter';

/**
 * @param {import('sql-template-tag').Sql} sql
 * @returns {string}
 */
export default function formatSql(sql) {
  const strings = sql.strings.slice(0);
  const values = sql.values.slice(0);
  const output = [];
  while (strings.length) {
    output.push(strings.shift());

    if (!values.length) break;
    const value = values.shift();
    output.push(
      typeof value === 'number'
        ? value.toString()
        : value === null
          ? 'null'
          : typeof value === 'object'
            ? `'${JSON.stringify(value)}'`
            : `'${value}'`,
    );
  }
  return format(output.join(''), { language: 'postgresql' });
}
