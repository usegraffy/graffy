import sql, { raw, join, empty } from 'sql-template-tag';
import { isEmpty } from '@graffy/common';

export const nowTimestamp = sql`cast(extract(epoch from now()) as integer)`;

export const getJsonBuildObject = (variadic) => {
  const args = join(
    Object.entries(variadic).map(([name, value]) => {
      return sql`'${raw(name)}', ${value}`;
    }),
  );
  return sql`jsonb_build_object(${args})`;
};

export const getSelectCols = (table) => {
  // TODO: When we have a query object, get only the requested columns.
  return sql`to_jsonb("${raw(table)}")`;
};

export const getInsert = (row, options) => {
  const cols = [];
  const vals = [];

  Object.entries(row)
    .filter(([name]) => name !== options.verCol && name[0] !== '$')
    .concat([[options.verCol, nowTimestamp]])
    .forEach(([col, val]) => {
      cols.push(sql`"${raw(col)}"`);
      vals.push(val);
    });

  return { cols: join(cols, ', '), vals: join(vals, ', ') };
};

export const getUpdates = (row, options) => {
  return join(
    Object.entries(row)
      .filter(([name]) => name !== options.idCol && name[0] !== '$')
      .map(([name, value]) => {
        return sql`"${raw(name)}" = ${
          typeof value === 'object' && value
            ? getJsonUpdate(value, name, [])
            : value
        }`;
      })
      .concat(sql`"${raw(options.verCol)}" = ${nowTimestamp}`),
    ', ',
  );
};

function getJsonUpdate({ $put, ...object }, col, path) {
  if ($put) return object;

  const curr = sql`"${raw(col)}"${path.length ? sql`#>${path}` : empty}`;
  if (isEmpty(object)) return curr;

  return sql`(case jsonb_typeof(${curr})
    when 'object' then ${curr}
    else '{}'::jsonb) ||
  jsonb_build_object(${join(
    Object.entries(object).map(
      ([key, value]) =>
        sql`${key}, ${
          typeof value === 'object' && value
            ? getJsonUpdate(value, col, path.concat(key))
            : value
        }`,
    ),
    ', ',
  )})`;
}
