import { wrap, unwrap } from '@graffy/common';
import { dbRead, dbWrite } from './transaction';
import pg from './pool.js';

export default (opts = {}) =>
  (store) => {
    store.on('read', read);
    store.on('write', write);

    function read(query) {
      return dbRead(query, opts, store);
    }

    async function write(change) {
      change = unwrap(change, store.path);
      await dbWrite(change, opts);
      return wrap(change, store.path);
    }
  };

export const connect = (config) => pg.connect(config);
export const setPool = (pool) => pg.setPool(pool);
export const setPgClient = (client) => pg.setClient(client);
export const setDefaultAst = (defaults) => setDefaultAstOp(defaults);
