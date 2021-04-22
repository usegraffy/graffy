import sql, { raw } from 'sql-template-tag';

export default ({ idCol }) =>
  sql`jsonb_build_object('$key', "${raw(idCol)}", '$ver', now())`;
