import sql, { join, raw } from 'sql-template-tag';
import { isEmpty } from '@graffy/common';

export default function getSelectCols(options) {
  return join(
    [
      options.defCol && raw(`"${options.defCol}"`),
      !isEmpty(options.columns) &&
        sql`jsonb_build_object( ${join(
          Object.entries(options.columns)
            .filter(([_, { role }]) => role !== 'default' && role !== 'version')
            .flatMap(([column, { prop }]) => [
              raw(`'${prop}'`), // Comes from options, considered trusted.
              raw(`"${column}"`),
            ]),
          ', ',
        )} )`,
    ].filter(Boolean),
    ` || `,
  );
}
