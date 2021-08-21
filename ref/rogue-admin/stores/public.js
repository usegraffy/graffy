/*
  This is the public store; It is exposed to the outside world.
  It performs authentication and rate limiting before forwarding requests to
  either a per-tenant store or a global store.
*/

import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import logger from '@graffy/logger';
import globalStore from './global.js';
import getTenantStore from './tenant.js';

const store = new Graffy();
store.use(fill());
store.use(logger());

store.core.on('read', ['tenant'], (...args) => {
  return globalStore.call('read', ...args);
});
store.core.on('write', ['tenant'], (...args) =>
  globalStore.call('write', ...args),
);
store.core.on('watch', ['tenant'], (...args) =>
  globalStore.call('watch', ...args),
);

store.on('read', async (query, options) => {
  return (await getTenantStore(options.tenantId)).call('read', query, options);
});
store.on('write', async (change, options) => {
  return (await getTenantStore(options.tenantId)).call(
    'write',
    change,
    options,
  );
});
store.on('watch', async function* (query, options) {
  yield* (await getTenantStore(options.tenantId)).call('watch', query, options);
});

export default store;
