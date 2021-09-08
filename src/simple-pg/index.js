import { wrap, unwrap } from '@graffy/common';
import { Transaction } from './transaction';

const pg =
  ({ client, opts }) =>
  (store) => {
    const myTransaction = new Transaction({ client, opts });
    store.on('read', read);
    store.on('write', write);

    function read(query) {
      return myTransaction.dbRead(query, opts, store);
    }

    async function write(change) {
      change = unwrap(change, store.path);
      await myTransaction.dbWrite(change, opts, store);
      return wrap(change, store.path);
    }
  };

pg.customize = (defaultOptions) => (options) =>
  pg({ ...defaultOptions, ...options });
export default pg;
