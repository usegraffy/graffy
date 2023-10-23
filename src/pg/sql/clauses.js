import sql, { Sql, raw, join, empty } from 'sql-template-tag';
import { isDef, isEmpty } from '@graffy/common';

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

export const lookup = (prop, options) => {
  const [prefix, ...suffix] = prop.split('.');
  if (!suffix.length) return sql`"${raw(prefix)}"`;

  const { types } = options.schema;
  if (types[prefix] === 'jsonb') {
    return sql`"${raw(prefix)}" #> ${suffix}`;
  } else if (types[prefix] === 'cube' && suffix.length === 1) {
    return sql`"${raw(prefix)}" ~> ${parseInt(suffix[0])}`;
  } else {
    throw Error(`pg.cannot_lookup ${prop}`);
  }
};

export const lookupNumeric = (prop) => {
  const [prefix, ...suffix] = prop.split('.');
  return suffix.length
    ? sql`CASE WHEN "${raw(prefix)}" #> ${suffix} = 'null'::jsonb
      THEN 0 ELSE ("${raw(prefix)}" #> ${suffix})::numeric END`
    : sql`"${raw(prefix)}"`;
};

const aggSql = {
  $sum: (prop) => sql`sum((${lookupNumeric(prop)})::numeric)`,
  $card: (prop, options) => sql`count(distinct(${lookup(prop, options)}))`,
  $avg: (prop) => sql`avg((${lookupNumeric(prop)})::numeric)`,
  $max: (prop) => sql`max((${lookupNumeric(prop)})::numeric)`,
  $min: (prop) => sql`min((${lookupNumeric(prop)})::numeric)`,
};

export const getSelectCols = (options, projection = null) => {
  if (!projection) return sql`*`;

  const sqls = [];
  for (const key in projection) {
    if (key === '$count') {
      sqls.push(sql`count(*) AS "$count"`);
    } else if (aggSql[key]) {
      const subSqls = [];
      for (const prop in projection[key]) {
        subSqls.push(sql`${prop}::text, ${aggSql[key](prop, options)}`);
      }
      sqls.push(
        sql`jsonb_build_object(${join(subSqls, ', ')}) AS "${raw(key)}"`,
      );
    } else {
      sqls.push(sql`"${raw(key)}"`);
    }
  }

  return join(sqls, ', ');
};

function vertexSql(array, nullValue) {
  return sql`array[${join(
    array.map((num) => (num === null ? nullValue : num)),
  )}]::float8[]`;
}

export function cubeLiteralSql(value) {
  if (
    !(Array.isArray(value) && value.length) ||
    (Array.isArray(value[0]) && value.length !== 2)
  ) {
    throw Error(`pg.castValue_bad_cube${JSON.stringify(value)}`);
  }
  return Array.isArray(value[0])
    ? sql`cube(${vertexSql(value[0], sql`'-Infinity'`)}, ${vertexSql(
      value[1],
      sql`'Infinity'`,
    )})`
    : sql`cube(${vertexSql(value, 0)})`;
}

function castValue(value, type, name, isPut) {
  if (!type) throw Error(`pg.write_no_column ${name}`);
  if (value instanceof Sql) return value;
  if (value === null) return sql`NULL`;

  if (type === 'jsonb') {
    if (value.$val) return JSON.stringify(value);
    if (isPut) return JSON.stringify(stripAttributes(value));
    return getJsonUpdate(value, name, []);
  }

  if (type === 'cube') return cubeLiteralSql(value);

  return value;
}

export const getInsert = (row, options) => {
  const cols = [];
  const vals = [];

  Object.entries(row)
    .filter(([col]) => col !== options.verCol && col[0] !== '$')
    .concat([[options.verCol, sql`default`]])
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
      .concat(sql`"${raw(options.verCol)}" = default`),
    ', ',
  );
};

function getJsonUpdate(object, col, path) {
  if (
    !object ||
    typeof object !== 'object' ||
    Array.isArray(object) ||
    object.$put ||
    object.$val
  ) {
    console.log('Trivial json update for', object, getJsonBuildValue(object));
    return getJsonBuildValue(object);
  }

  let curr = sql`"${raw(col)}"${path.length ? sql`#>${path}` : empty}`;
  if (isEmpty(object)) return curr;

  const { updates, deletes } = Object.entries(object).reduce((acc, [key, val]) => {
    if (val === null) {
      acc.deletes.push(key);
    } else {
      const jsonUpdate = getJsonUpdate(val, col, path.concat(key));
      if (
        typeof jsonUpdate !== 'undefined' &&
        (typeof jsonUpdate !== 'object' || !isEmpty(jsonUpdate))
      ) {
        acc.updates.push(sql`${key}::text, ${jsonUpdate}`);
      }
    }
    return acc;
  }, { updates: [], deletes: [] });

  console.log('prepared', object, updates, deletes);

  curr = sql`case jsonb_typeof(${curr}) when 'object' then ${curr} else '{}'::jsonb end`;
  if (updates.length) curr = sql`(${curr}) || jsonb_build_object(${join(updates, ', ')})`;
  if (deletes.length) curr = sql`(${curr}) - ${deletes}::text[]`;
  return sql`nullif(${curr}, '{}'::jsonb)`;
}

function stripAttributes(object) {
  if (typeof object !== 'object' || !object || object.$val) return object;
  if (Array.isArray(object)) {
    return object.map((item) => stripAttributes(item));
  }

  const out = Object.entries(object).reduce(
    (out, [key, val]) => {
      if (key === '$put' || val === null) return out;
      const outVal = stripAttributes(val);
      const skip = !isDef(outVal) || outVal === null || (typeof outVal === 'object' && isEmpty(outVal));
      if (!skip) out[key] = outVal;
      return out;
    },
    {},
  );

  if (isEmpty(out) && object.$put) return null;
  return out;
}
