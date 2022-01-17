import sql, { join, raw } from 'sql-template-tag';
import { getJsonBuildTrusted, nowTimestamp } from './clauses';

export const getIdMeta = ({ idCol }) =>
  getJsonBuildTrusted({
    $key: sql`"${raw(idCol)}"`,
    $ver: nowTimestamp,
  });

export const getArgMeta = (key, prefix, idCol) =>
  getJsonBuildTrusted({
    $key: key,
    $ref: sql`jsonb_build_array(${join(
      prefix.map((k) => sql`${k}::text`),
    )}, "${raw(idCol)}")`,
    $ver: nowTimestamp,
  });

export const getAggMeta = (key, $group) =>
  getJsonBuildTrusted({
    $key: join([key, getJsonBuildTrusted({ $group })].filter(Boolean), ' || '),
    $ver: nowTimestamp,
  });
