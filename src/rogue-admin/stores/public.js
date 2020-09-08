/*
  This is the public store; It is exposed to the outside world.
  It performs authentication and rate limiting before forwarding requests to
  either a per-tenant store or a global store.
*/

import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import globalStore from './global.js';
import getTenantStore from './tenant.js';

const store = new Graffy();
store.use(fill());

store.core.on('read', ['tenant'], (...args) => {
  return globalStore.call('read', ...args);
});
store.core.on('write', ['tenant'], (...args) =>
  globalStore.call('write', ...args),
);
store.core.on('watch', ['tenant'], (...args) =>
  globalStore.call('watch', ...args),
);

store.on('read', (...args) => getTenantStore(...args).call('read', ...args));
store.on('write', (...args) => getTenantStore(...args).call('write', ...args));
store.on('watch', (...args) => getTenantStore(...args).call('watch', ...args));

export default store;
