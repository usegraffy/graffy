import { wrap, unwrap } from '@graffy/common';
import { Transaction } from './transaction';
// import debug from 'debug';
// const log = debug('graffy:pg:index');
// import { format } from '@graffy/testing';

export default ({ client, opts }) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);

    // TODO: Make the defaults smarter using introspection.
    const prefix = store.path;
    const pgOptions = {
      prefix,
      table: prefix[prefix.length - 1] || 'default',
      idCol: 'id',
      verCol: 'updatedAt',
      links: {},
      pollInterval: 5000,
      ...opts,
    };

    const myTransaction = new Transaction({ client, pgOptions });
    store.on('read', read);
    store.on('write', write);

    async function read(query) {
      const res = await myTransaction.dbRead(query);
      return res;
    }

    async function write(change) {
      change = unwrap(change, prefix);
      await myTransaction.dbWrite(change);
      return wrap(change, prefix);
    }
  };
