import sql, { join, raw } from 'sql-template-tag';
import { getJsonBuildTrusted } from './clauses';

export const getIdMeta = ({ idCol, verDefault }) =>
  getJsonBuildTrusted({
    $key: sql`"${raw(idCol)}"`,
    $ver: raw(verDefault),
  });

export const getArgMeta = (key, { prefix, idCol, verDefault }) =>
  getJsonBuildTrusted({
    $key: key,
    $ref: sql`jsonb_build_array(${join(
      prefix.map((k) => sql`${k}::text`),
    )}, "${raw(idCol)}")`,
    $ver: raw(verDefault),
  });

export const getAggMeta = (key, $group, { verDefault }) =>
  getJsonBuildTrusted({
    $key: join([key, getJsonBuildTrusted({ $group })].filter(Boolean), ' || '),
    $ver: raw(verDefault),
  });
