import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import db from '@graffy/rogue-db';

const store = new Graffy();
store.use(fill());
store.use(
  'tenant',
  db({
    collection: 'tenant',
    indexes: [],
    links: [],
  }),
);

export default store;
