import sql, { raw, join } from 'sql-template-tag';

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
            ? sql`"${raw(name)}" || ${value}`
            : value
        }`;
      })
      .concat(sql`"${raw(options.verCol)}" = ${nowTimestamp}`),
    ', ',
  );
};
