import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import memory from '@graffy/memory';
import db from '@graffy/rogue-db';

import debug from 'debug';
const log = debug('graffy:rogue:tenantStore');

import globalStore from './global.js';

const cache = {};

export function createTenantStore(config) {
  log('Create tenant store', config);
  const store = new Graffy();
  store.use(fill());
  store.use('__schema', memory());
  for (const prefix in config) {
    const { type, ...providerConfig } = config[prefix];
    switch (type) {
      case 'db':
        store.use(prefix, db(providerConfig));
        break;
      default:
        throw Error('rogueAdmin.unknown_provider: ' + type);
    }
  }
  return store;
}

export default async function getTenantStore(id) {
  log('Get tenant store', id);
  if (!cache[id]) {
    cache[id] = createTenantStore(
      (await globalStore.read(['tenant', id], { providers: 1 })).providers,
    );
  }
  return cache[id];
}
