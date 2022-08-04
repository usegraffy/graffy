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

export const getAggMeta = (key, $group, { verDefault }) => {
  let $key = join(
    [key, getJsonBuildTrusted({ $group })].filter(Boolean),
    ' || ',
  );
  if ($group === true) {
    $key = join([getJsonBuildTrusted({ $group })].filter(Boolean), ' || ');
  }
  return getJsonBuildTrusted({
    $key,
    $ver: raw(verDefault),
  });
};
