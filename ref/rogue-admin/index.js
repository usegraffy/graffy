import React, { useCallback } from 'react';
import Graffy from '@graffy/core';
import fill from '@graffy/fill';
import client from '@graffy/client';
import { GraffyProvider } from '@graffy/react';

import Admin from './components/Admin.js';

let tenantId = 'tenant0';

const store = new Graffy();
if (process.browser) {
  store.use(fill());
  // store.use(mock);
  const url = /\busehttp\b/.test(location.search)
    ? '/api'
    : `${location.origin.replace('http', 'ws')}/api`;
  store.use(
    client(url, {
      getOptions: () => ({ tenantId }),
    }),
  );
}

export default function AdminProvider() {
  const setTenantId = useCallback((id) => {
    tenantId = id;
  });
  return (
    <GraffyProvider store={store}>
      <Admin setTenantId={setTenantId} defaultTenantId={tenantId} />
    </GraffyProvider>
  );
}
