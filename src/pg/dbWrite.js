import { selectByArgs, selectByIds, insert, update, readSql } from './sql';
import { linkChange } from './link';
import { acquirePool, releasePool } from './pool';
import {
  isArgObject,
  isRange,
  decodeArgs,
  decodeGraph,
  mergeObject,
} from '@graffy/common';
import debug from 'debug';
import sql from 'sqlate';
const log = debug('graffy:stdDb:dbWrite');

export default async function dbWrite(change, pgOptions) {
  const sqls = [];
  const ids = [];
  const writers = [];
  const idChanges = [];

  for (const node of change) {
    if (isRange(node) && node.key === node.end) {
      throw Error('pg_write.delete_unsupported');
    }

    if (isRange(node)) throw Error('pg_write.write_range_unsupported');

    const object = linkChange(decodeGraph(node.children), pgOptions.links);
    const args = decodeArgs(node);

    if (isArgObject(args)) {
      sqls.push(selectByArgs(args, pgOptions, { forUpdate: true }));
      writers.push((res) => writeObject(res[0], object));
    } else {
      ids.push(node.key);
      idChanges.push(object);
    }
  }

  if (ids.length) {
    sqls.push(selectByIds(ids, pgOptions, { forUpdate: true }));
    writers.push(async (res) =>
      Promise.all(
        res.map((current, i) => writeObject(current, idChanges[i], pgOptions)),
      ),
    );
  }

  const pool = acquirePool();
  const client = await pool.connect();
  client.query(sql`BEGIN TRANSACTION`);

  async function writeObject(current, object) {
    if (current) {
      const updated = object._rng_ ? object : mergeObject(current, object);
      await client.query(update(updated, pgOptions));
    } else {
      if (!object[pgOptions.idCol] || !object._rng_)
        throw Error('pg_insert.not_full_object');
      await client.query(insert(object, pgOptions));
    }
  }

  await Promise.all(sqls.map((sql) => readSql(sql, pool)));

  client.query(sql`COMMIT`);
  client.release();
  releasePool();
  log(change);
  return change;
}
