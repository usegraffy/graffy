import { wrap, unwrap } from '@graffy/common';
import { DbWrapper } from './db';
// import debug from 'debug';
// const log = debug('graffy:pg:index');
// import { format } from '@graffy/testing';

export default ({ opts }) =>
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
      ...opts,
    };

    const db = new DbWrapper({ pgOptions });
    store.on('read', read);
    store.on('write', write);

    async function read(query) {
      const res = await db.read(query);
      return res;
    }

    async function write(change) {
      change = unwrap(change, prefix);
      await db.write(change);
      return wrap(change, prefix);
    }
  };
