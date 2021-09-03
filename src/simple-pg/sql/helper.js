import sql, { raw, join } from 'sql-template-tag';

export const nowTimestamp = sql`cast(extract(epoch from now()) as integer)`;

export const colsAndValues = (data, versionCol) => ({
  cols: join(
    Object.keys(data)
      .map((col) => raw(`"${col}"`))
      .concat(raw(`"${versionCol}"`)),
    ', ',
  ),
  values: join(Object.values(data).concat(Date.now()), ', '),
});

export const whereConditions = (data) =>
  join(
    Object.entries(data).map(([name, value]) => {
      return sql`"${raw(name)}" = ${value}`;
    }),
  );

export const getUpdates = (data, options) => {
  const { id, version } = options;
  return join(
    Object.entries(data)
      .filter(([name]) => name !== id)
      .map(([name, value]) => {
        return sql`"${raw(name)}" = ${value}`;
      })
      .concat(sql`"${raw(version)}" =  ${nowTimestamp}`),
    ', ',
  );
};

export const updateAudits = () => {};
