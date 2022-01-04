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
    $ref: sql`jsonb_build_array(${join(
      prefix.map((k) => sql`${k}::text`),
    )}, "${raw(idCol)}")`,
    $ver: nowTimestamp,
  });

export const getAggMeta = (key, $group) =>
  getJsonBuildObject({
    $key: join([key, getJsonBuildObject({ $group })].filter(Boolean), ' || '),
    $ver: nowTimestamp,
  });
