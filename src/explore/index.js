import React, { useState, useEffect } from 'react';
import Graffy from '@graffy/core';
import GraffyFill from '@graffy/fill';
import GraffyClient from '@graffy/client';
import { GraffyProvider } from '@graffy/react';
import * as common from '@graffy/common';

import Explore from './Explore';

export default function ExploreContainer({
  baseUrl = '/',
  getOptions,
  ...options
}) {
  const [store, setStore] = useState();

  useEffect(() => {
    const store = new Graffy();
    store.use(GraffyFill());
    store.use(GraffyClient(baseUrl, { getOptions }));
    setStore(store);
    window.store = store;
    window.graffy = common;
  }, [baseUrl]);

  return store ? (
    <GraffyProvider store={store}>
      <Explore {...options} />
    </GraffyProvider>
  ) : null;
}
