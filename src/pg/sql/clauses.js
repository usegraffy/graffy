import { isEmpty } from '@graffy/common';
import sql, { Sql, empty, join, raw } from 'sql-template-tag';

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
  }
  if (types[prefix] === 'cube' && suffix.length === 1) {
    return sql`"${raw(prefix)}" ~> ${Number.parseInt(suffix[0])}`;
  }
  throw Error(`pg.cannot_lookup ${prop}`);
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

const getOptimisedJsonBuild = (object, path, parentPropertyName, options) => {
  const propertyNames = Object.keys(object);
  const propertyPath = [...path, parentPropertyName];
  const buildConfig = [];

  path = path || [];

  propertyNames.forEach((propertyName) => {
    const property = object[propertyName];
    if (typeof property === 'object') {
      const childJSONBuild = getOptimisedJsonBuild(
        property,
        propertyPath,
        propertyName,
        options,
      );
      buildConfig.push(
        sql`${propertyName}::text, jsonb_build_object(${join(childJSONBuild, ', ')})`,
      );
    } else {
      if (property === true) {
        buildConfig.push(
          sql`${propertyName}::text, ${lookup([...propertyPath, propertyName].join('.'), options)}`,
        );
      }
    }
  });

  return buildConfig;
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
      if (typeof projection[key] === 'object') {
        const optimisedJsonBuild = getOptimisedJsonBuild(
          projection[key],
          [],
          key,
          options,
        );

        sqls.push(
          sql`jsonb_build_object(${join(optimisedJsonBuild, ', ')}) AS "${raw(key)}"`,
        );
      } else {
        sqls.push(sql`"${raw(key)}"`);
      }
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
    return isPut
      ? JSON.stringify(stripAttributes(value))
      : getJsonUpdate(value, name, [])[0];
  }

  if (type === 'cube') return cubeLiteralSql(value);

  return value;
}

export const getInsert = (rows, options) => {
  const { verCol, schema } = options;
  const cols = [];
  const colSqls = [];
  const colIx = {};
  const colUsed = [];

  for (const col of Object.keys(options.schema.types)) {
    colIx[col] = cols.length;
    colUsed[cols.length] = false;
    cols.push(col);
    colSqls.push(sql`"${raw(col)}"`);
  }

  colUsed[colIx[verCol]] = true;

  const vals = [];
  for (const row of rows) {
    const rowVals = Array(cols.length).fill(sql`default`);

    for (const col of cols) {
      if (col === verCol || !(col in row)) continue;
      const ix = colIx[col];
      colUsed[ix] = true;
      rowVals[ix] = castValue(row[col], schema.types[col], col, row.$put);
    }

    vals.push(rowVals);
  }

  const isUsed = (_, ix) => colUsed[ix];

  return {
    cols: join(colSqls.filter(isUsed), ', '),
    vals: join(
      vals.map((rowVals) => sql`(${join(rowVals.filter(isUsed), ', ')})`),
      ', ',
    ),
    updates: join(
      colSqls.map((col, ix) => sql`${col} =  "excluded".${col}`).filter(isUsed),
      ', ',
    ),
  };
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

/**
 * @param {any} object
 * @param {string} col
 * @param {string[]} path
 * @returns {[Sql, boolean]}
 * The boolean is true if the SQL may evaluate to null
 */
function getJsonUpdate(object, col, path) {
  if (
    !object ||
    typeof object !== 'object' ||
    Array.isArray(object) ||
    object.$put
  ) {
    const patch = stripAttributes(object);
    return [sql`${JSON.stringify(patch)}::jsonb`, patch === null];
  }

  if ('$val' in object) {
    const value = object.$val === true ? stripAttributes(object) : object.$val;
    return [sql`${JSON.stringify({ $val: value })}::jsonb`, false];
  }

  const curr = sql`"${raw(col)}"${path.length ? sql`#>${path}` : empty}`;
  if (isEmpty(object)) return [curr, false];

  const baseSql = sql`case jsonb_typeof(${curr})
    when 'object' then ${curr}
    else '{}'::jsonb
  end`;

  let maybeNull = true; // Is it possible for this object to lose *all* its properties?
  let hasNulls = false; // Is it possible that one of the properties becomes null?

  const patchSqls = Object.entries(object).map(([key, value]) => {
    const [valSql, nullable] = getJsonUpdate(value, col, path.concat(key));
    maybeNull &&= nullable;
    hasNulls ||= nullable;
    return sql`${key}::text, ${valSql}`;
  });

  let clause = sql`${baseSql} || jsonb_build_object(${join(patchSqls, ', ')})`;
  if (hasNulls) {
    clause = sql`(select jsonb_object_agg(key, value)
      from jsonb_each(${clause}) where value <> 'null'::jsonb)`;
  }
  if (maybeNull) {
    clause = sql`nullif(${clause}, '{}'::jsonb)`;
  }

  return [clause, maybeNull];
}

function stripAttributes(object) {
  if (typeof object !== 'object' || !object) return object;
  if (Array.isArray(object)) {
    return object.map((item) => stripAttributes(item));
  }

  return Object.entries(object).reduce(
    (/** @type {null|Record<string,any>} */ out, [key, val]) => {
      if (key === '$put' || val === null) return out;
      if (out === null) out = {};
      out[key] = stripAttributes(val);
      return out;
    },
    null,
  );
}
