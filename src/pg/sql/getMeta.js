import sql, { join, raw } from 'sql-template-tag';
import { getJsonBuildObject, nowTimestamp } from './clauses';

export const getIdMeta = ({ idCol }) =>
  getJsonBuildObject({
    $key: sql`"${raw(idCol)}"`,
    $ver: nowTimestamp,
  });

export const getArgMeta = (key, prefix, idCol) =>
  getJsonBuildObject({
    $key: key,
    $ref: sql`array[${join(prefix)}, "${raw(idCol)}"]`,
    $ver: nowTimestamp,
  });
