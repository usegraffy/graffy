import sql, { Sql, raw, join, empty } from 'sql-template-tag';
import { isEmpty } from '@graffy/common';

export const nowTimestamp = sql`cast(extract(epoch from now()) as integer)`;

/*
  Important: This function assumes that the object's keys are from
  trusted sources.
*/
export const getJsonBuildObject = (variadic) => {
  const args = join(
    Object.entries(variadic).map(([name, value]) => {
      return sql`'${raw(name)}', ${getJsonBuildValue(value)}`;
    }),
  );
  return sql`jsonb_build_object(${args})`;
};

const getJsonBuildValue = (value) => {
  if (value instanceof Sql) return value;
  if (typeof value === 'string') return sql`${value}::text`;
  return sql`${JSON.stringify(stripAttributes(value))}::jsonb`;
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
      vals.push(
        val instanceof Sql || typeof val !== 'object' || !val
          ? val
          : sql`${JSON.stringify(stripAttributes(val))}::jsonb`,
      );
    });

  return { cols: join(cols, ', '), vals: join(vals, ', ') };
};

export const getUpdates = (row, options) => {
  return join(
    Object.entries(row)
      .filter(([name]) => name !== options.idCol && name[0] !== '$')
      .map(([name, value]) => {
        return sql`"${raw(name)}" = ${
          value instanceof Sql || typeof value !== 'object' || !value
            ? value
            : !value.$put
            ? sql`jsonb_strip_nulls(${getJsonUpdate(value, name, [])})`
            : sql`${JSON.stringify(stripAttributes(value))}::jsonb`
        }`;
      })
      .concat(sql`"${raw(options.verCol)}" = ${nowTimestamp}`),
    ', ',
  );
};

function getJsonUpdate({ $put, ...object }, col, path) {
  if ($put) return JSON.stringify(object);

  const curr = sql`"${raw(col)}"${path.length ? sql`#>${path}` : empty}`;
  if (isEmpty(object)) return curr;

  return sql`(case jsonb_typeof(${curr})
    when 'object' then ${curr}
    else '{}'::jsonb
  end) || jsonb_build_object(${join(
    Object.entries(object).map(
      ([key, value]) =>
        /* Note: here we do not trust object keys */
        sql`${key}::text, ${
          typeof value === 'object' && value && !Array.isArray(value)
            ? getJsonUpdate(value, col, path.concat(key))
            : sql`${getJsonBuildValue(value)}`
        }`,
    ),
    ', ',
  )})`;
}

function stripAttributes(object) {
  if (typeof object !== 'object' || !object) return object;
  if (Array.isArray(object)) {
    return object.map((item) => stripAttributes(item));
  }

  return Object.entries(object).reduce((out, [key, val]) => {
    if (key === '$put') return out;
    out[key] = stripAttributes(val);
    return out;
  }, {});
}
