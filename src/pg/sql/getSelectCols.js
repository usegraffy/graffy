import sql, { raw } from 'sql-template-tag';

export default function getSelectCols(options) {
  // TODO: When we have a query object, get only the requested columns.
  return sql`to_json("${raw(options.table)}")`;
}
