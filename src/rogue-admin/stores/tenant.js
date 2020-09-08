import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import db from '@graffy/rogue-db';

import globalStore from './global.js';

const cache = {};

export function createTenantStore(config) {
  const store = new Graffy();
  store.use(fill());
  for (const { prefix, type, ...providerConfig } of config) {
    switch (type) {
      case db:
        store.use(prefix, db(providerConfig));
        break;
      default:
        throw Error('rogueAdmin.unknown_provider: ' + type);
    }
  }
  return store;
}

export default async function getTenantStore(id) {
  if (!cache[id])
    cache[id] = createTenantStore(
      await globalStore.read(['tenant', id, 'providers'], {
        _key_: { first: 200 },
        prefix: true,
        type: true,
        collection: true,
        indexes: true,
        links: true,
      }),
    );
  return cache[id];
}
