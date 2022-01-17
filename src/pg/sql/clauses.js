import sql, { Sql, raw, join, empty } from 'sql-template-tag';
import { encodePath, isEmpty } from '@graffy/common';

export const nowTimestamp = sql`cast(extract(epoch from now()) as integer)`;

/*
  Important: This function assumes that the object's keys are from
  trusted sources.
*/
export const getJsonBuildTrusted = (variadic) => {
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

export const lookup = (prop) => {
  const [prefix, ...suffix] = encodePath(prop);
  return suffix.length
    ? sql`"${raw(prefix)}" #> ${suffix}`
    : sql`"${raw(prefix)}"`;
};

const aggSql = {
  $sum: (prop) => sql`sum((${lookup(prop)})::numeric)`,
  $card: (prop) => sql`count(distinct(${lookup(prop)}))`,
  $avg: (prop) => sql`sum((${lookup(prop)})::numeric)`,
  $max: (prop) => sql`sum((${lookup(prop)})::numeric)`,
  $min: (prop) => sql`sum((${lookup(prop)})::numeric)`,
};

export const getSelectCols = (table, projection = null) => {
  if (!projection) return sql`to_jsonb("${raw(table)}")`;

  const sqls = [];
  for (const key in projection) {
    if (key === '$count') {
      sqls.push(sql`'$count', count(*)`);
    } else if (aggSql[key]) {
      const subSqls = [];
      for (const prop in projection[key]) {
        subSqls.push(sql`${prop}::text, ${aggSql[key](prop)}`);
      }
      sqls.push(sql`${key}::text, jsonb_build_object(${join(subSqls, ', ')})`);
    } else {
      sqls.push(sql`${key}::text, "${raw(key)}"`);
    }
  }

  return sql`jsonb_build_object(${join(sqls, ', ')})`;
};

export function vertexSql(array) {
  return sql`array[${join(
    array.map((num) =>
      num === Infinity
        ? sql`'Infinity'`
        : num === -Infinity
        ? sql`'-Infinity'`
        : num,
    ),
  )}]::float8[]`;
}

function castValue(value, type, name, isPut) {
  if (!type) throw Error('pg.write_no_column ' + name);
  if (value instanceof Sql) return value;
  if (value === null) return sql`NULL`;

  if (type === 'jsonb') {
    return isPut
      ? JSON.stringify(stripAttributes(value))
      : sql`jsonb_strip_nulls(${getJsonUpdate(value, name, [])})`;
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

  return value;
}

export const getInsert = (row, options) => {
  const cols = [];
  const vals = [];

  Object.entries(row)
    .filter(([col]) => col !== options.verCol && col[0] !== '$')
    .concat([[options.verCol, nowTimestamp]])
    .forEach(([col, val]) => {
      cols.push(sql`"${raw(col)}"`);
      vals.push(castValue(val, options.schema.types[col], col, row.$put));
    });

  return { cols: join(cols, ', '), vals: join(vals, ', ') };
};

export const getUpdates = (row, options) => {
  return join(
    Object.entries(row)
      .filter(([col]) => col !== options.idCol && col[0] !== '$')
      .map(
        ([col, val]) =>
          sql`"${raw(col)}" = ${castValue(
            val,
            options.schema.types[col],
            col,
            row.$put,
          )}`,
      )
      .concat(sql`"${raw(options.verCol)}" = ${nowTimestamp}`),
    ', ',
  );
};

function getJsonUpdate(object, col, path) {
  if (
    !object ||
    typeof object !== 'object' ||
    Array.isArray(object) ||
    object.$put
  ) {
    return getJsonBuildValue(object);
  }

  const curr = sql`"${raw(col)}"${path.length ? sql`#>${path}` : empty}`;
  if (isEmpty(object)) return curr;

  return sql`(case jsonb_typeof(${curr})
    when 'object' then ${curr}
    else '{}'::jsonb
  end) || jsonb_build_object(${join(
    Object.entries(object).map(
      ([key, value]) =>
        /* Note: here we do not trust object keys */
        sql`${key}::text, ${getJsonUpdate(value, col, path.concat(key))}`,
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
