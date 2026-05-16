import GraffyClient from '@graffy/client';
import * as common from '@graffy/common';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import { GraffyProvider } from '@graffy/react';
import { useEffect, useState } from 'react';

import Explore from './Explore.tsx';

export default function ExploreContainer({
  baseUrl = '/',
  getOptions,
  ...options
}) {
  const [store, setStore] = useState<any>(null);

  useEffect(() => {
    const store = new Graffy();
    store.use(GraffyFill());
    store.use(GraffyClient(baseUrl, { getOptions }));
    setStore(store);
    (window as any).store = store;
    (window as any).graffy = common;
  }, [baseUrl, getOptions]);

  return store ? (
    <GraffyProvider store={store}>
      <Explore {...options} />
    </GraffyProvider>
  ) : null;
}
