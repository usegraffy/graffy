import { selectByArgs, selectByIds, upsertToId } from './sql';
import { linkResult } from './link';
import { isEncoded, decodeArgs, makeGraph, decorate } from '@graffy/common';

export default ({ collection, indexes = [], links = [] } = {}) => (store) => {
  store.on('read', read);
  store.on('write', write);
  store.on('watch', watch);

  const options = {
    prefix: store.path,
    collection: collection || store.path[store.path.length - 1] || 'default',
    indexes,
    links,
  };

  async function read(query) {
    const ops = [];
    const ids = [];
    const idSubQueries = [];

    console.log('db:read', query);

    for (const node of query) {
      if (isEncoded(node.key)) {
        const args = decodeArgs(node);
        ops.push(
          selectByArgs(args, options).then((res) =>
            linkResult(res, node.children, links),
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
            (object, i) => linkResult([object], idSubQueries[i], links)[0],
          ),
        ),
      );
    }

    // Each promise resolves to an array of objects.
    return makeGraph((await Promise.all(ops)).flat(1));
  }

  async function write(change) {
    const ops = [];

    for (const node of change) {
      if (isEncoded(node.key)) {
        throw Error('pg_write.write_arg_unimplemented');
      } else {
        ops.push(
          upsertToId({ id: node.key, ...decorate(node.children) }, options),
        );
      }
    }

    await Promise.all(ops);
    return change;
  }

  function watch(_query) {
    throw Error('pg_watch.unimplemented');
  }
};
