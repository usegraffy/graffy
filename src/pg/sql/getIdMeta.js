import sql, { raw } from 'sql-template-tag';

export default ({ idCol }) =>
  sql`jsonb_build_object('$key', "${raw(
    idCol,
  )}", '$ver', cast(extract(epoch from now()) as integer))`;
