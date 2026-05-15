import sql, { join, raw } from 'sql-template-tag';

export const getIdMeta = ({ idCol, verDefault }) =>
  sql`"${raw(idCol)}" AS "$key", ${raw(verDefault)} AS "$ver"`;

export const getArgMeta = (key, { prefix, idCol, verDefault }) =>
  sql`
    ${key} AS "$key",
    ${raw(verDefault)} AS "$ver",
    array[
      ${join(prefix.map((k) => sql`${k}::text`))},
      "${raw(idCol)}"
    ]::text[] AS "$ref"
  `;

export const getAggMeta = (key, { verDefault }) =>
  sql`${key} AS "$key", ${raw(verDefault)} AS "$ver"`;
