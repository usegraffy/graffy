import {
  add,
  isPlainObject,
  decodeArgs,
  wrap,
  unwrap,
  finalize,
  merge,
  wrapObject,
  slice,
  encodeGraph,
  isEmpty,
  isRange,
  decodeGraph,
} from '@graffy/common';
import { linkChange, linkResult } from './link/index.js';
import { selectByArgs, selectByIds } from './sql/select';
import { put, patch } from './sql/index.js';
import { format } from '@graffy/testing';
import debug from 'debug';
const log = debug('graffy:pg:dbRead');
import { PgDb } from './db/pool';
export class DbWrapper {
  // client is pgClient
  constructor({ pgOptions }) {
    this.pgOptions = pgOptions;
    const { connection, poolOption, handlers } = pgOptions;
    this.db = new PgDb({ connection, poolOption, handlers });
  }

  async read(rootQuery, opts = this.pgOptions) {
    const db = this.db;
    const idQueries = {};
    const promises = [];
    const results = [];
    const refQuery = [];
    const { id: idCol, prefix } = opts;

    async function getByArgs(args, subQuery) {
      const result = await db.read(selectByArgs(args, opts));
      add(refQuery, linkResult(result, subQuery, opts));

      const wrappedQuery = wrap(subQuery, [...prefix, args]);
      const wrappedGraph = encodeGraph(wrapObject(result, prefix));

      log(
        'getByArgs',
        format(wrappedGraph),
        format(wrappedQuery),
        format(finalize(wrappedGraph, wrappedQuery)),
      );

      merge(results, finalize(wrappedGraph, wrappedQuery));
    }

    async function getByIds() {
      const result = await db.read(selectByIds(Object.keys(idQueries), opts));
      result.forEach((object) => {
        const id = object[idCol];
        const subQuery = idQueries[id];
        add(refQuery, linkResult([object], subQuery, opts));
        const wrappedQuery = wrap(subQuery, [...prefix, id]);
        const wrappedGraph = encodeGraph(wrapObject(object, prefix));

        log(
          'getByIds',
          format(wrappedGraph),
          format(wrappedQuery),
          format(finalize(wrappedGraph, wrappedQuery)),
        );

        merge(results, finalize(wrappedGraph, wrappedQuery));
      });
    }

    const query = unwrap(rootQuery, prefix);
    for (const node of query) {
      const args = decodeArgs(node);
      if (isPlainObject(args)) {
        promises.push(getByArgs(args, node.children));
      } else {
        idQueries[node.key] = node.children;
      }
    }

    if (!isEmpty(idQueries)) promises.push(getByIds());
    await Promise.all(promises);

    log('dbRead', format(rootQuery), format(results));
    return slice(results, rootQuery).known || [];
  }

  async write(change, opts = this.pgOptions) {
    const db = this.db;
    const queries = [];

    const addToQuery = (sql) => queries.push(sql);

    for (const node of change) {
      if (isRange(node)) {
        throw Error(
          node.key === node.end
            ? 'pg_write.delete_unsupported'
            : 'pg_write.write_range_unsupported',
        );
      }

      const object = linkChange(decodeGraph(node.children), opts);
      const arg = decodeArgs(node);

      if (object.$put && object.$put !== true)
        throw Error('pg_write.partial_put_unsupported');

      object.$put
        ? addToQuery(put(object, arg, opts))
        : addToQuery(patch(object, arg, opts));
    }

    await Promise.all(queries.map((sql) => db.write(sql)));

    log(change);
    return change;
  }
}
