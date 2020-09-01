import { selectByArgs, selectByIds, upsertToId } from './sql';
import { isEncoded, decodeArgs, makeGraph, decorate } from '@graffy/common';

export default ({
  table,
  columns = ['id', 'type', 'name', 'createTime', 'updateTime'],
  dataColumn = 'data',
  indexColumn = 'tags',
  indexProps = [],
  links = [],
} = {}) => (store) => {
  store.on('read', read);
  store.on('write', write);
  store.on('watch', watch);

  const options = {
    prefix: store.path,
    table: table || store.path[store.path.length - 1] || 'default',
    columns,
    dataColumn,
    indexColumn,
    indexProps,
    links,
  };

  async function read(query) {
    const ops = [];
    const ids = [];

    for (const node of query.children) {
      if (isEncoded(node.key)) {
        const args = decodeArgs(node);
        ops.push(selectByArgs(args, options));
      } else {
        ids.push(node.key);
      }
    }

    if (ids.length) ops.push(selectByIds(ids, options));

    // Each promise resolves to an array of objects.
    return makeGraph((await Promise.all(ops)).flat(1));
  }

  async function write(change) {
    const ops = [];

    for (const node of change.children) {
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
