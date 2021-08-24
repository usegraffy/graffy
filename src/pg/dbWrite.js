import { put, patch } from './sql/index.js';
import { linkChange } from './link/index.js';
import { pgPool } from './pool.js';
import { isRange, decodeArgs, decodeGraph } from '@graffy/common';
import debug from 'debug';
const log = debug('graffy:pg:dbWrite');

export default async function dbWrite(change, pgOptions) {
  const sqls = [];

  for (const node of change) {
    if (isRange(node)) {
      throw Error(
        node.key === node.end
          ? 'pg_write.delete_unsupported'
          : 'pg_write.write_range_unsupported',
      );
    }

    const object = linkChange(decodeGraph(node.children), pgOptions);
    const arg = decodeArgs(node);

    if (object.$put) {
      if (object.$put !== true) throw Error('pg_write.partial_put_unsupported');
      sqls.push(put(object, arg, pgOptions));
    } else {
      sqls.push(patch(object, arg, pgOptions));
    }
  }

  await Promise.all(sqls.map((sql) => writeSql(sql, pool)));

  log(change);
  return change;
}

async function writeSql(query, client) {
  log(query.text);
  log(query.values);

  query.rowMode = 'array';
  const res = await client.query(query);
  log('Rows written', res.rowCount);
  return res.rowCount;
}
