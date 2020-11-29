import { selectByArgs, selectByIds, upsertToId } from './sql';
import { linkResult } from './link';
import { isArgObject, isRange, decodeArgs, decodeGraph } from '@graffy/common';

export async function dbRead(query, options) {
  const ops = [];
  const ids = [];
  const idSubQueries = [];

  for (const node of query) {
    const args = decodeArgs(node);

    if (isArgObject(args)) {
      ops.push(
        selectByArgs(args, options).then((res) =>
          linkResult(res, node.children, options.links),
        ),
      );
    } else {
      ids.push(node.key);
      idSubQueries.push(node.children);
    }
  }

  if (ids.length) {
    ops.push(
      selectByIds(ids, options).then((res) =>
        res.map(
          (object, i) =>
            linkResult([object], idSubQueries[i], options.links)[0],
        ),
      ),
    );
  }

  return (await Promise.all(ops)).flat(1);
}

export async function dbWrite(change, options) {
  const ops = [];

  for (const node of change) {
    if (isRange(node)) {
      throw Error('pg_write.no_write_range');
    }

    const args = decodeArgs(node);
    if (isArgObject(args)) {
      throw Error('pg_write.write_arg_unimplemented');
    } else {
      ops.push(
        upsertToId({ id: [node.key], ...decodeGraph(node.children) }, options),
      );
    }
  }

  await Promise.all(ops);
  return change;
}
